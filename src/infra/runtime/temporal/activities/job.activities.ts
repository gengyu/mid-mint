import {
  assertContentBrief,
  assertDeckPlan,
  assertParsedSource,
  assertRenderResult,
  assertReviewResult,
  assertVisualSpec
} from "@/core/domain/validation";
import type { Job, JobStatus, ReviewResult, RewriteStage } from "@/core/domain/types";
import { createAppError } from "@/shared/errors/app-error";
import {
  StageExecutionError,
  type StageRunResult,
  createDeterministicStageResult
} from "@/application/jobs/stage-execution";
import type { WorkflowModules, WorkflowRepositories } from "@/application/jobs/job-runtime.types";

type ReviewFinalization = {
  status: JobStatus;
  errorCode: string | null;
};

function createStageExecutionError(
  stageName: JobStatus,
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

function normalizeStageResult<T>(stageName: JobStatus, result: T | StageRunResult<T>): StageRunResult<T> {
  if (typeof result === "object" && result !== null && "output" in result && "meta" in result) {
    return result as StageRunResult<T>;
  }

  return createDeterministicStageResult(stageName, result as T);
}

export interface TemporalJobActivities {
  loadJob(jobId: string): Promise<Job>;
  executeParsedStage(jobId: string, versionNumber: number): Promise<void>;
  executeBriefStage(jobId: string, versionNumber: number): Promise<void>;
  executeDeckStage(jobId: string, versionNumber: number): Promise<void>;
  executeVisualStage(jobId: string, versionNumber: number): Promise<void>;
  executeRenderStage(jobId: string, versionNumber: number): Promise<void>;
  executeReviewStage(jobId: string, versionNumber: number): Promise<void>;
  finalizeReview(jobId: string, versionNumber: number): Promise<ReviewFinalization>;
  createRewriteVersion(jobId: string, targetStage: RewriteStage, reason: string): Promise<number>;
}

export class TemporalJobActivitiesImpl implements TemporalJobActivities {
  constructor(
    private readonly repositories: WorkflowRepositories,
    private readonly modules: WorkflowModules
  ) {}

  async loadJob(jobId: string): Promise<Job> {
    const job = this.repositories.jobs.getById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return job;
  }

  async executeParsedStage(jobId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.parsedSources.get(jobId, versionNumber);
    const rewriteStage = this.getRewriteStage(jobId, versionNumber);
    if (existing && rewriteStage !== "source-parse") {
      return;
    }

    const sourceInput = this.requireArtifact(
      this.repositories.sourceInputs.get(jobId, versionNumber),
      "Source input not found."
    );

    await this.executeStage("PARSED", jobId, versionNumber, async () => {
      const result = await this.modules.sourceParser.parse(sourceInput);
      const validated = assertParsedSource(result.output);
      this.repositories.parsedSources.save(jobId, versionNumber, validated);
      return {
        output: validated,
        meta: result.meta
      };
    });
  }

  async executeBriefStage(jobId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.contentBriefs.get(jobId, versionNumber);
    const rewriteStage = this.getRewriteStage(jobId, versionNumber);
    if (existing && rewriteStage !== "brief" && rewriteStage !== "source-parse") {
      return;
    }

    const sourceInput = this.requireArtifact(
      this.repositories.sourceInputs.get(jobId, versionNumber),
      "Source input not found."
    );
    const parsedSource = this.requireArtifact(
      this.repositories.parsedSources.get(jobId, versionNumber),
      "Parsed source not found."
    );

    await this.executeStage("BRIEFED", jobId, versionNumber, async () => {
      const result = await this.modules.briefGenerator.generate({
        ...parsedSource,
        targetAudience: sourceInput.targetAudience,
        contentGoal: sourceInput.contentGoal,
        preferredStyle: sourceInput.preferredStyle
      });
      const validated = assertContentBrief(result.output);
      this.repositories.contentBriefs.save(jobId, versionNumber, validated);
      return {
        output: validated,
        meta: result.meta
      };
    });
  }

  async executeDeckStage(jobId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.deckPlans.get(jobId, versionNumber);
    const rewriteStage = this.getRewriteStage(jobId, versionNumber);
    if (existing && rewriteStage === null) {
      return;
    }
    if (existing && rewriteStage === "visual") {
      return;
    }

    const parsedSource = this.requireArtifact(
      this.repositories.parsedSources.get(jobId, versionNumber),
      "Parsed source not found."
    );
    const contentBrief = this.requireArtifact(
      this.repositories.contentBriefs.get(jobId, versionNumber),
      "Content brief not found."
    );

    await this.executeStage("DECK_GENERATED", jobId, versionNumber, async () => {
      const result = await this.modules.deckGenerator.generate({
        parsedSource,
        contentBrief
      });
      const validated = assertDeckPlan(result.output);
      this.repositories.deckPlans.save(jobId, versionNumber, validated);
      return {
        output: validated,
        meta: result.meta
      };
    });
  }

  async executeVisualStage(jobId: string, versionNumber: number): Promise<void> {
    const existingVisual = this.repositories.visualSpecs.get(jobId, versionNumber);
    const existingDeck = this.repositories.deckPlans.get(jobId, versionNumber);
    const rewriteStage = this.getRewriteStage(jobId, versionNumber);
    if (existingVisual && existingDeck && rewriteStage === null) {
      return;
    }

    const parsedSource = this.requireArtifact(
      this.repositories.parsedSources.get(jobId, versionNumber),
      "Parsed source not found."
    );
    const contentBrief = this.requireArtifact(
      this.repositories.contentBriefs.get(jobId, versionNumber),
      "Content brief not found."
    );
    const deckPlan = this.requireArtifact(
      this.repositories.deckPlans.get(jobId, versionNumber),
      "Deck plan not found."
    );
    const sourceInput = this.requireArtifact(
      this.repositories.sourceInputs.get(jobId, versionNumber),
      "Source input not found."
    );

    await this.executeStage("VISUAL_MATCHED", jobId, versionNumber, async () => {
      const result = await this.modules.visualMatch.match({
        parsedSource,
        contentBrief,
        deckPlan,
        preferredStyle: sourceInput.preferredStyle
      });
      const validatedDeckPlan = assertDeckPlan(result.output.deckPlan);
      const validatedVisualSpec = assertVisualSpec(result.output.visualSpec);
      this.repositories.deckPlans.save(jobId, versionNumber, validatedDeckPlan);
      this.repositories.visualSpecs.save(jobId, versionNumber, validatedVisualSpec);
      return {
        output: {
          deckPlan: validatedDeckPlan,
          visualSpec: validatedVisualSpec
        },
        meta: result.meta
      };
    });
  }

  async executeRenderStage(jobId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.renderResults.get(jobId, versionNumber);
    if (existing) {
      return;
    }

    const deckPlan = this.requireArtifact(
      this.repositories.deckPlans.get(jobId, versionNumber),
      "Deck plan not found."
    );
    const visualSpec = this.requireArtifact(
      this.repositories.visualSpecs.get(jobId, versionNumber),
      "Visual spec not found."
    );

    await this.executeStage("RENDERED", jobId, versionNumber, async () => {
      const result = await this.modules.renderer.render({
        jobId,
        versionNumber,
        deckPlan,
        visualSpec
      });
      const validated = assertRenderResult(result, deckPlan.slides.length);
      this.repositories.renderResults.save(jobId, versionNumber, validated);
      return validated;
    });
  }

  async executeReviewStage(jobId: string, versionNumber: number): Promise<void> {
    const existing = this.repositories.reviewResults.get(jobId, versionNumber);
    if (existing) {
      return;
    }

    const parsedSource = this.requireArtifact(
      this.repositories.parsedSources.get(jobId, versionNumber),
      "Parsed source not found."
    );
    const contentBrief = this.requireArtifact(
      this.repositories.contentBriefs.get(jobId, versionNumber),
      "Content brief not found."
    );
    const deckPlan = this.requireArtifact(
      this.repositories.deckPlans.get(jobId, versionNumber),
      "Deck plan not found."
    );
    const visualSpec = this.requireArtifact(
      this.repositories.visualSpecs.get(jobId, versionNumber),
      "Visual spec not found."
    );
    const renderResult = this.requireArtifact(
      this.repositories.renderResults.get(jobId, versionNumber),
      "Render result not found."
    );

    await this.executeStage("REVIEWED", jobId, versionNumber, async () => {
      const result = await this.modules.reviewer.review({
        parsedSource,
        contentBrief,
        deckPlan,
        visualSpec,
        renderResult
      });
      const validated = assertReviewResult(result.output);
      this.repositories.reviewResults.save(jobId, versionNumber, validated);
      return {
        output: validated,
        meta: result.meta
      };
    });
  }

  async finalizeReview(
    jobId: string,
    versionNumber: number
  ): Promise<{ status: "APPROVED" | "FAILED" | "REWRITE_PENDING"; errorCode: string | null }> {
    const reviewResult = this.requireArtifact(
      this.repositories.reviewResults.get(jobId, versionNumber),
      "Review result not found."
    );

    if (reviewResult.decision === "approve") {
      return { status: "APPROVED", errorCode: null };
    }

    if (reviewResult.decision === "block") {
      return { status: "FAILED", errorCode: "REVIEW_BLOCKED" };
    }

    const shouldStopForLowImprovement = this.hasLowImprovementStreak(jobId);
    const job = this.requireArtifact(
      this.repositories.jobs.getById(jobId),
      `Job not found: ${jobId}`
    );
    const status = job.rewriteCount >= 3 || shouldStopForLowImprovement ? "FAILED" : "REWRITE_PENDING";

    return {
      status,
      errorCode: status === "FAILED" ? "LOW_IMPROVEMENT_STREAK" : null
    };
  }

  async createRewriteVersion(jobId: string, targetStage: RewriteStage, reason: string): Promise<number> {
    const job = this.repositories.jobs.getById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    if (job.rewriteCount >= 3) {
      throw new Error("Rewrite limit reached.");
    }

    const currentVersion = job.activeVersion;
    const nextVersion = currentVersion + 1;
    const existingVersion = this.repositories.jobVersions.listByJobId(jobId)
      .find((version) => version.versionNumber === nextVersion);
    if (existingVersion) {
      return nextVersion;
    }

    this.repositories.jobVersions.create({
      jobId,
      versionNumber: nextVersion,
      trigger: "rewrite",
      rewriteStage: targetStage
    });
    this.copyRewriteArtifacts(jobId, currentVersion, nextVersion, targetStage);
    this.repositories.rewriteLogs.create({
      jobId,
      fromVersion: currentVersion,
      toVersion: nextVersion,
      targetStage,
      reason
    });
    this.updateJob(jobId, (current) => ({
      ...current,
      rewriteCount: current.rewriteCount + 1,
      activeVersion: nextVersion
    }));
    return nextVersion;
  }

  private getRewriteStage(jobId: string, versionNumber: number) {
    return this.repositories.jobVersions.listByJobId(jobId)
      .find((version) => version.versionNumber === versionNumber)?.rewriteStage ?? null;
  }

  private requireArtifact<T>(value: T | null, message: string): T {
    if (value === null) {
      throw new Error(message);
    }

    return value;
  }

  private updateJob(jobId: string, updater: (job: Job) => Job): Job {
    const updated = this.repositories.jobs.update(jobId, updater);
    if (!updated) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return updated;
  }

  private async executeStage<T>(
    stageName: JobStatus,
    jobId: string,
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
        jobId,
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
        jobId,
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

  private hasLowImprovementStreak(jobId: string) {
    const reviewRepository = this.repositories.reviewResults;
    const listByJobId = reviewRepository.listByJobId;
    if (!listByJobId) {
      return false;
    }

    const rows = listByJobId(jobId)
      .filter((item): item is { jobId: string; versionNumber: number; payload?: ReviewResult } => "versionNumber" in item)
      .filter((item): item is { jobId: string; versionNumber: number; payload: ReviewResult } => Boolean(item.payload))
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
    jobId: string,
    fromVersion: number,
    toVersion: number,
    targetStage: RewriteStage
  ) {
    const sourceInput = this.repositories.sourceInputs.get(jobId, fromVersion);
    if (sourceInput) {
      this.repositories.sourceInputs.save(jobId, toVersion, sourceInput);
    }

    if (targetStage === "source-parse") {
      return;
    }

    const parsedSource = this.repositories.parsedSources.get(jobId, fromVersion);
    if (parsedSource) {
      this.repositories.parsedSources.save(jobId, toVersion, parsedSource);
    }

    if (targetStage === "brief") {
      return;
    }

    const contentBrief = this.repositories.contentBriefs.get(jobId, fromVersion);
    if (contentBrief) {
      this.repositories.contentBriefs.save(jobId, toVersion, contentBrief);
    }

    if (targetStage === "deck") {
      return;
    }

    const deckPlan = this.repositories.deckPlans.get(jobId, fromVersion);
    if (deckPlan) {
      this.repositories.deckPlans.save(jobId, toVersion, deckPlan);
    }
  }
}
