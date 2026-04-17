import {
  assertContentBrief,
  assertDeckPlan,
  assertParsedSource,
  assertRenderResult,
  assertReviewResult,
  assertVisualSpec
} from "@/core/domain/validation";
import type { WorkflowInstance, ReviewResult, RewriteStage, WorkflowStageStatus } from "@/core/domain/types";
import { createAppError } from "@/shared/errors/app-error";
import {
  StageExecutionError,
  type StageRunResult,
  createDeterministicStageResult
} from "@/application/workflows/stage-execution";
import type { WorkflowModules, WorkflowRepositories } from "@/application/workflows/workflow-runtime.types";

type ReviewFinalization = {
  status: WorkflowStageStatus;
  errorCode: string | null;
};

function createStageExecutionError(
  stageName: WorkflowStageStatus,
  error: unknown,
  durationMs: number
): StageExecutionError {
  if (error instanceof StageExecutionError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Stage failed.";
  const errorCode =
    error instanceof Error && "error" in error && typeof (error as { error?: { code?: string } }).error?.code === "string"
      ? (error as { error: { code: string } }).error.code
      : "STAGE_FAILED";

  return new StageExecutionError(createAppError(errorCode, message), {
    stageName,
    usedLlm: false,
    llmAttempted: false,
    model: null,
    usedFallback: false,
    retryOccurred: false,
    durationMs,
    errorCode
  });
}

function normalizeStageResult<T>(stageName: WorkflowStageStatus, result: T | StageRunResult<T>): StageRunResult<T> {
  if (typeof result === "object" && result !== null && "output" in result && "meta" in result) {
    return result as StageRunResult<T>;
  }

  return createDeterministicStageResult(stageName, result as T);
}

export interface TemporalWorkflowActivities {
  loadWorkflowInstance(workflowId: string): Promise<WorkflowInstance>;
  executeParsedStage(workflowId: string, versionNumber: number): Promise<void>;
  executeBriefStage(workflowId: string, versionNumber: number): Promise<void>;
  executeDeckStage(workflowId: string, versionNumber: number): Promise<void>;
  executeVisualStage(workflowId: string, versionNumber: number): Promise<void>;
  executeRenderStage(workflowId: string, versionNumber: number): Promise<void>;
  executeReviewStage(workflowId: string, versionNumber: number): Promise<void>;
  finalizeReview(workflowId: string, versionNumber: number): Promise<ReviewFinalization>;
  createRewriteVersion(workflowId: string, targetStage: RewriteStage, reason: string): Promise<number>;
}

export class TemporalWorkflowActivitiesImpl implements TemporalWorkflowActivities {
  constructor(
    private readonly repositories: WorkflowRepositories,
    private readonly modules: WorkflowModules
  ) {}

  async loadWorkflowInstance(workflowId: string): Promise<WorkflowInstance> {
    return this.requireWorkflowInstance(workflowId);
  }

  async executeParsedStage(workflowId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.parsedSources.get(workflowId, versionNumber);
    const rewriteStage = this.getRewriteStage(workflowId, versionNumber);
    if (existing && rewriteStage !== "source-parse") {
      return;
    }

    const sourceInput = this.requireArtifact(
      this.repositories.sourceInputs.get(workflowId, versionNumber),
      "Source input not found."
    );

    await this.executeStage("PARSED", workflowId, versionNumber, async () => {
      const result = await this.modules.sourceParser.parse(sourceInput);
      const validated = assertParsedSource(result.output);
      this.repositories.parsedSources.save(workflowId, versionNumber, validated);
      return {
        output: validated,
        meta: result.meta
      };
    });
  }

  async executeBriefStage(workflowId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.contentBriefs.get(workflowId, versionNumber);
    const rewriteStage = this.getRewriteStage(workflowId, versionNumber);
    if (existing && rewriteStage !== "brief" && rewriteStage !== "source-parse") {
      return;
    }

    const sourceInput = this.requireArtifact(
      this.repositories.sourceInputs.get(workflowId, versionNumber),
      "Source input not found."
    );
    const parsedSource = this.requireArtifact(
      this.repositories.parsedSources.get(workflowId, versionNumber),
      "Parsed source not found."
    );

    await this.executeStage("BRIEFED", workflowId, versionNumber, async () => {
      const result = await this.modules.briefGenerator.generate({
        ...parsedSource,
        targetAudience: sourceInput.targetAudience,
        contentGoal: sourceInput.contentGoal,
        preferredStyle: sourceInput.preferredStyle
      });
      const validated = assertContentBrief(result.output);
      this.repositories.contentBriefs.save(workflowId, versionNumber, validated);
      return {
        output: validated,
        meta: result.meta
      };
    });
  }

  async executeDeckStage(workflowId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.deckPlans.get(workflowId, versionNumber);
    const rewriteStage = this.getRewriteStage(workflowId, versionNumber);
    if (existing && rewriteStage === null) {
      return;
    }
    if (existing && rewriteStage === "visual") {
      return;
    }

    const parsedSource = this.requireArtifact(
      this.repositories.parsedSources.get(workflowId, versionNumber),
      "Parsed source not found."
    );
    const contentBrief = this.requireArtifact(
      this.repositories.contentBriefs.get(workflowId, versionNumber),
      "Content brief not found."
    );

    await this.executeStage("DECK_GENERATED", workflowId, versionNumber, async () => {
      const result = await this.modules.deckGenerator.generate({
        parsedSource,
        contentBrief
      });
      const validated = assertDeckPlan(result.output);
      this.repositories.deckPlans.save(workflowId, versionNumber, validated);
      return {
        output: validated,
        meta: result.meta
      };
    });
  }

  async executeVisualStage(workflowId: string, versionNumber: number): Promise<void> {
    const existingVisual = this.repositories.visualSpecs.get(workflowId, versionNumber);
    const existingDeck = this.repositories.deckPlans.get(workflowId, versionNumber);
    const rewriteStage = this.getRewriteStage(workflowId, versionNumber);
    if (existingVisual && existingDeck && rewriteStage === null) {
      return;
    }

    const parsedSource = this.requireArtifact(
      this.repositories.parsedSources.get(workflowId, versionNumber),
      "Parsed source not found."
    );
    const contentBrief = this.requireArtifact(
      this.repositories.contentBriefs.get(workflowId, versionNumber),
      "Content brief not found."
    );
    const deckPlan = this.requireArtifact(
      this.repositories.deckPlans.get(workflowId, versionNumber),
      "Deck plan not found."
    );
    const sourceInput = this.requireArtifact(
      this.repositories.sourceInputs.get(workflowId, versionNumber),
      "Source input not found."
    );

    await this.executeStage("VISUAL_MATCHED", workflowId, versionNumber, async () => {
      const result = await this.modules.visualMatch.match({
        parsedSource,
        contentBrief,
        deckPlan,
        preferredStyle: sourceInput.preferredStyle
      });
      const validatedDeckPlan = assertDeckPlan(result.output.deckPlan);
      const validatedVisualSpec = assertVisualSpec(result.output.visualSpec);
      this.repositories.deckPlans.save(workflowId, versionNumber, validatedDeckPlan);
      this.repositories.visualSpecs.save(workflowId, versionNumber, validatedVisualSpec);
      return {
        output: {
          deckPlan: validatedDeckPlan,
          visualSpec: validatedVisualSpec
        },
        meta: result.meta
      };
    });
  }

  async executeRenderStage(workflowId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.renderResults.get(workflowId, versionNumber);
    if (existing) {
      return;
    }

    const deckPlan = this.requireArtifact(
      this.repositories.deckPlans.get(workflowId, versionNumber),
      "Deck plan not found."
    );
    const visualSpec = this.requireArtifact(
      this.repositories.visualSpecs.get(workflowId, versionNumber),
      "Visual spec not found."
    );

    await this.executeStage("RENDERED", workflowId, versionNumber, async () => {
      const result = await this.modules.renderer.render({
        workflowId,
        versionNumber,
        deckPlan,
        visualSpec
      });
      const validated = assertRenderResult(result, deckPlan.slides.length);
      this.repositories.renderResults.save(workflowId, versionNumber, validated);
      return validated;
    });
  }

  async executeReviewStage(workflowId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.reviewResults.get(workflowId, versionNumber);
    if (existing) {
      return;
    }

    const parsedSource = this.requireArtifact(
      this.repositories.parsedSources.get(workflowId, versionNumber),
      "Parsed source not found."
    );
    const contentBrief = this.requireArtifact(
      this.repositories.contentBriefs.get(workflowId, versionNumber),
      "Content brief not found."
    );
    const deckPlan = this.requireArtifact(
      this.repositories.deckPlans.get(workflowId, versionNumber),
      "Deck plan not found."
    );
    const visualSpec = this.requireArtifact(
      this.repositories.visualSpecs.get(workflowId, versionNumber),
      "Visual spec not found."
    );
    const renderResult = this.requireArtifact(
      this.repositories.renderResults.get(workflowId, versionNumber),
      "Render result not found."
    );

    await this.executeStage("REVIEWED", workflowId, versionNumber, async () => {
      const result = await this.modules.reviewer.review({
        parsedSource,
        contentBrief,
        deckPlan,
        visualSpec,
        renderResult
      });
      const validated = assertReviewResult(result.output);
      this.repositories.reviewResults.save(workflowId, versionNumber, validated);
      return {
        output: validated,
        meta: result.meta
      };
    });
  }

  async finalizeReview(
    workflowId: string,
    versionNumber: number
  ): Promise<{ status: "APPROVED" | "FAILED" | "REWRITE_PENDING"; errorCode: string | null }> {
    const reviewResult = this.requireArtifact(
      this.repositories.reviewResults.get(workflowId, versionNumber),
      "Review result not found."
    );

    if (reviewResult.decision === "approve") {
      return { status: "APPROVED", errorCode: null };
    }

    if (reviewResult.decision === "block") {
      return { status: "FAILED", errorCode: "REVIEW_BLOCKED" };
    }

    const shouldStopForLowImprovement = this.hasLowImprovementStreak(workflowId);
    const workflow = this.requireWorkflowInstance(workflowId);
    const status = workflow.rewriteCount >= 3 || shouldStopForLowImprovement ? "FAILED" : "REWRITE_PENDING";

    return {
      status,
      errorCode: status === "FAILED" ? "LOW_IMPROVEMENT_STREAK" : null
    };
  }

  async createRewriteVersion(workflowId: string, targetStage: RewriteStage, reason: string): Promise<number> {
    const workflow = this.requireWorkflowInstance(workflowId);

    if (workflow.rewriteCount >= 3) {
      throw new Error("Rewrite limit reached.");
    }

    const currentVersion = workflow.activeVersion;
    const nextVersion = currentVersion + 1;
    const existingVersion = this.repositories.workflowVersions
      .listByWorkflowId(workflowId)
      .find((version) => version.versionNumber === nextVersion);
    if (existingVersion) {
      return nextVersion;
    }

    this.repositories.workflowVersions.create({
      workflowId,
      versionNumber: nextVersion,
      trigger: "rewrite",
      rewriteStage: targetStage
    });
    this.copyRewriteArtifacts(workflowId, currentVersion, nextVersion, targetStage);
    this.repositories.rewriteLogs.create({
      workflowId,
      fromVersion: currentVersion,
      toVersion: nextVersion,
      targetStage,
      reason
    });
    return nextVersion;
  }

  private getRewriteStage(workflowId: string, versionNumber: number) {
    return this.repositories.workflowVersions
      .listByWorkflowId(workflowId)
      .find((version) => version.versionNumber === versionNumber)?.rewriteStage ?? null;
  }

  private requireArtifact<T>(value: T | null, message: string): T {
    if (value === null) {
      throw new Error(message);
    }

    return value;
  }

  private async executeStage<T>(
    stageName: WorkflowStageStatus,
    workflowId: string,
    versionNumber: number,
    executor: () => Promise<T | StageRunResult<T>>
  ): Promise<T> {
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();

    try {
      const rawResult = await executor();
      const normalizedResult = normalizeStageResult(stageName, rawResult);
      const finishedAt = new Date().toISOString();
      this.repositories.stageLogs.create({
        workflowId,
        versionNumber,
        stageName,
        startedAt,
        finishedAt,
        status: "success",
        model: normalizedResult.meta.model,
        usedLlm: normalizedResult.meta.usedLlm,
        llmAttempted: normalizedResult.meta.llmAttempted,
        retryOccurred: normalizedResult.meta.retryOccurred,
        usedFallback: normalizedResult.meta.usedFallback,
        durationMs: normalizedResult.meta.durationMs,
        errorCode: normalizedResult.meta.errorCode,
        errorMessage: null
      });
      return normalizedResult.output;
    } catch (error) {
      const finishedAtMs = Date.now();
      const finishedAt = new Date(finishedAtMs).toISOString();
      const stageError = createStageExecutionError(stageName, error, finishedAtMs - startedAtMs);
      this.repositories.stageLogs.create({
        workflowId,
        versionNumber,
        stageName,
        startedAt,
        finishedAt,
        status: "error",
        model: stageError.meta.model,
        usedLlm: stageError.meta.usedLlm,
        llmAttempted: stageError.meta.llmAttempted,
        retryOccurred: stageError.meta.retryOccurred,
        usedFallback: stageError.meta.usedFallback,
        durationMs: stageError.meta.durationMs,
        errorCode: stageError.meta.errorCode,
        errorMessage: stageError.error.message
      });
      throw stageError;
    }
  }

  private hasLowImprovementStreak(workflowId: string) {
    const listByWorkflowId = this.repositories.reviewResults.listByWorkflowId;
    if (!listByWorkflowId) {
      return false;
    }

    const rows = listByWorkflowId(workflowId)
      .filter((item): item is { workflowId: string; versionNumber: number; payload?: ReviewResult } => "versionNumber" in item)
      .filter((item): item is { workflowId: string; versionNumber: number; payload: ReviewResult } => Boolean(item.payload))
      .sort((left, right) => left.versionNumber - right.versionNumber);

    if (rows.length < 3) {
      return false;
    }

    const [thirdLast, secondLast, last] = rows.slice(-3);
    const improvementA = secondLast.payload.score - thirdLast.payload.score;
    const improvementB = last.payload.score - secondLast.payload.score;
    return improvementA < 3 && improvementB < 3;
  }

  private copyRewriteArtifacts(
    workflowId: string,
    fromVersion: number,
    toVersion: number,
    targetStage: RewriteStage
  ) {
    const sourceInput = this.repositories.sourceInputs.get(workflowId, fromVersion);
    if (sourceInput) {
      this.repositories.sourceInputs.save(workflowId, toVersion, sourceInput);
    }

    if (targetStage === "source-parse") {
      return;
    }

    const parsedSource = this.repositories.parsedSources.get(workflowId, fromVersion);
    if (parsedSource) {
      this.repositories.parsedSources.save(workflowId, toVersion, parsedSource);
    }

    if (targetStage === "brief") {
      return;
    }

    const contentBrief = this.repositories.contentBriefs.get(workflowId, fromVersion);
    if (contentBrief) {
      this.repositories.contentBriefs.save(workflowId, toVersion, contentBrief);
    }

    if (targetStage === "deck") {
      return;
    }

    const deckPlan = this.repositories.deckPlans.get(workflowId, fromVersion);
    if (deckPlan) {
      this.repositories.deckPlans.save(workflowId, toVersion, deckPlan);
    }
  }

  private requireWorkflowInstance(workflowId: string): WorkflowInstance {
    const versions = this.repositories.workflowVersions.listByWorkflowId(workflowId);
    if (!versions.length) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    const latest = versions[0];
    return {
      id: workflowId,
      rewriteCount: versions.filter((version) => version.trigger === "rewrite").length,
      activeVersion: latest.versionNumber,
      createdAt: versions[versions.length - 1]?.createdAt ?? latest.createdAt,
      updatedAt: latest.createdAt
    };
  }
}
