import { assertSourceInput, validateRewriteRequest } from "@/core/domain/validation";
import type {
  RewriteRequest,
  ReviewResult,
  SourceInput,
  WorkflowStageStatus,
  WorkflowInstance,
  WorkflowVersion
} from "@/core/domain/types";
import type { WorkflowRepositories } from "@/application/workflows/workflow-runtime.types";
import type { CreateWorkflowInput } from "@/application/workflows/workflow.types";
import { TemporalWorkflowRuntime } from "@/infra/runtime/temporal/temporal.runtime";
import { AppValidationError, createAppError } from "@/shared/errors/app-error";
import type { WorkflowRuntimeState } from "@/infra/runtime/temporal/workflows/types";
import { createId } from "@/infra/utils/id";

type WritableWorkflowRepositories = WorkflowRepositories & {
  workflowVersions: WorkflowRepositories["workflowVersions"] & {
    deleteByWorkflowId?: (workflowId: string) => number;
    list?: () => WorkflowVersion[];
  };
  sourceInputs: WorkflowRepositories["sourceInputs"] & {
    deleteByWorkflowIdAndVersion?: (workflowId: string, versionNumber: number) => number;
  };
};

export class WorkflowApplicationService {
  constructor(
    private readonly repositories: WritableWorkflowRepositories,
    private readonly temporalRuntime: TemporalWorkflowRuntime
  ) {}

  async createWorkflow(input: CreateWorkflowInput) {
    const sourceInput: SourceInput = assertSourceInput({
      urls: input.urls ?? [],
      rawText: input.rawText ?? "",
      notes: input.notes ?? "",
      targetAudience: input.targetAudience ?? "",
      contentGoal: input.contentGoal ?? "",
      preferredStyle: input.preferredStyle ?? ""
    });

    this.ensureRuntimeReady();

    const workflowId = createId("workflow");
    const versionNumber = 1;

    try {
      this.repositories.workflowVersions.create({
        workflowId,
        versionNumber,
        trigger: "initial",
        rewriteStage: null
      });
      this.repositories.sourceInputs.save(workflowId, versionNumber, sourceInput);

      const runtimeState = await this.startWorkflow(workflowId);
      const workflow = this.requireWorkflowInstance(workflowId);

      return {
        workflowId: workflow.id,
        status: "INPUT_RECEIVED" as const,
        activeVersion: workflow.activeVersion,
        runtimeStatus: runtimeState.runtimeStatus,
        currentStage: runtimeState.currentStage
      };
    } catch (error) {
      this.rollbackCreate(workflowId, versionNumber);
      throw error;
    }
  }

  async requestRewrite(workflowId: string, input: Omit<RewriteRequest, "workflowId">) {
    const request = this.assertRewriteRequest({
      workflowId,
      targetStage: input.targetStage,
      reason: input.reason
    });

    this.ensureRuntimeReady();

    const workflow = this.requireWorkflowInstance(request.workflowId);
    const runtimeState = await this.temporalRuntime.getRuntimeState(request.workflowId);
    if (runtimeState?.runtimeStatus !== "waiting_signal") {
      throw new AppValidationError(
        createAppError("REWRITE_NOT_AVAILABLE", "Current workflow is not waiting for rewrite.")
      );
    }

    await this.temporalRuntime.requestRewrite(request.workflowId, request.targetStage, request.reason);

    const nextVersion = await this.temporalRuntime.waitForVersion(request.workflowId, workflow.activeVersion + 1);
    const current = this.requireWorkflowInstance(request.workflowId);

    return {
      workflowId: current.id,
      status: this.deriveStatus(current, runtimeState),
      activeVersion: nextVersion ?? current.activeVersion
    };
  }

  async getWorkflow(workflowId: string) {
    const workflow = this.buildWorkflowInstance(workflowId);
    if (!workflow) {
      return null;
    }

    return this.decorateWorkflow(workflow);
  }

  async listWorkflows() {
    const workflows = this.listWorkflowInstances();
    return Promise.all(workflows.map((workflow) => this.decorateWorkflow(workflow)));
  }

  async getWorkflowVersion(workflowId: string, versionNumber: number) {
    const workflow = this.buildWorkflowInstance(workflowId);
    return {
      workflow: workflow ? await this.decorateWorkflow(workflow) : null,
      sourceInput: this.repositories.sourceInputs.get(workflowId, versionNumber),
      parsedSource: this.repositories.parsedSources.get(workflowId, versionNumber),
      contentBrief: this.repositories.contentBriefs.get(workflowId, versionNumber),
      deckPlan: this.repositories.deckPlans.get(workflowId, versionNumber),
      visualSpec: this.repositories.visualSpecs.get(workflowId, versionNumber),
      renderResult: this.repositories.renderResults.get(workflowId, versionNumber),
      reviewResult: this.repositories.reviewResults.get(workflowId, versionNumber),
      stageMeta: this.getStageMeta(workflowId, versionNumber)
    };
  }

  private async startWorkflow(workflowId: string) {
    this.ensureRuntimeReady();

    const runtimeState = await this.temporalRuntime.startOrReuse(workflowId);
    const workflow = this.requireWorkflowInstance(workflowId);

    return {
      workflowId: workflow.id,
      status: "INPUT_RECEIVED" as const,
      runtimeStatus: runtimeState?.runtimeStatus ?? null,
      currentStage: runtimeState?.currentStage ?? null
    };
  }

  private async decorateWorkflow(workflow: WorkflowInstance) {
    const runtimeState = this.temporalRuntime.isReady()
      ? await this.temporalRuntime.getRuntimeState(workflow.id)
      : null;
    const derivedStatus = this.deriveStatus(workflow, runtimeState);
    const derivedRuntimeStatus = runtimeState?.runtimeStatus ?? this.deriveRuntimeStatus(workflow);

    return {
      ...workflow,
      workflowId: workflow.id,
      status: derivedStatus,
      runtimeStatus: derivedRuntimeStatus,
      currentStage: runtimeState?.currentStage ?? this.deriveCurrentStage(workflow, derivedStatus),
      runtimeVersion: runtimeState?.currentVersion ?? workflow.activeVersion,
      lastErrorCode: runtimeState?.lastErrorCode ?? this.deriveLastErrorCode(workflow),
      pendingRewrite: runtimeState?.pendingRewrite ?? derivedStatus === "REWRITE_PENDING",
      temporalMode: this.temporalRuntime.getMode(),
      temporalError: this.temporalRuntime.getLastError()
    };
  }

  private listWorkflowInstances(): WorkflowInstance[] {
    const versions = this.repositories.workflowVersions.list?.() ?? [];
    const workflowIds = Array.from(new Set(versions.map((row) => row.workflowId)));
    return workflowIds
      .map((workflowId) => this.buildWorkflowInstance(workflowId))
      .filter((item): item is WorkflowInstance => Boolean(item))
      .sort((left, right) => (left.updatedAt < right.updatedAt ? 1 : -1));
  }

  private buildWorkflowInstance(workflowId: string): WorkflowInstance | null {
    const versions = this.repositories.workflowVersions.listByWorkflowId(workflowId);
    if (!versions.length) {
      return null;
    }

    const createdAt = versions[versions.length - 1]?.createdAt ?? versions[0].createdAt;
    const latestVersion = versions[0];
    const stageRows = this.repositories.stageLogs.listByWorkflowId?.(workflowId) ?? [];
    const rewriteRows = this.repositories.rewriteLogs.listByWorkflowId?.(workflowId) ?? [];
    const updatedAtCandidates = [
      latestVersion.createdAt,
      stageRows[0]?.finishedAt,
      rewriteRows[0]?.createdAt
    ].filter(Boolean) as string[];

    return {
      id: workflowId,
      rewriteCount: versions.filter((version) => version.trigger === "rewrite").length,
      activeVersion: latestVersion.versionNumber,
      createdAt,
      updatedAt: updatedAtCandidates.sort().slice(-1)[0] ?? latestVersion.createdAt
    };
  }

  private getStageMeta(workflowId: string, versionNumber: number) {
    const rows = this.repositories.stageLogs.listByWorkflowIdAndVersion?.(workflowId, versionNumber) ?? [];
    const stageOrder: WorkflowStageStatus[] = [
      "INPUT_RECEIVED",
      "PARSED",
      "BRIEFED",
      "DECK_GENERATED",
      "VISUAL_MATCHED",
      "RENDERED",
      "REVIEWED",
      "APPROVED",
      "REWRITE_PENDING",
      "FAILED"
    ];

    return rows
      .map((row) => ({
        stageName: row.stageName,
        status: row.status,
        startedAt: row.startedAt,
        finishedAt: row.finishedAt,
        usedLlm: row.usedLlm,
        llmAttempted: row.llmAttempted,
        model: row.model,
        usedFallback: row.usedFallback,
        retryOccurred: row.retryOccurred,
        durationMs: row.durationMs,
        errorCode: row.errorCode,
        errorMessage: row.errorMessage
      }))
      .sort((left, right) => stageOrder.indexOf(left.stageName) - stageOrder.indexOf(right.stageName));
  }

  private deriveStatus(workflow: WorkflowInstance, runtimeState: WorkflowRuntimeState | null): WorkflowStageStatus {
    if (runtimeState?.runtimeStatus === "waiting_signal") {
      return "REWRITE_PENDING";
    }
    if (runtimeState?.runtimeStatus === "completed") {
      return "APPROVED";
    }
    if (runtimeState?.runtimeStatus === "failed") {
      return "FAILED";
    }
    if (runtimeState?.currentStage) {
      return runtimeState.currentStage;
    }

    const reviewResult = this.repositories.reviewResults.get(workflow.id, workflow.activeVersion);
    if (reviewResult) {
      return this.deriveStatusFromReview(reviewResult);
    }
    if (this.repositories.renderResults.get(workflow.id, workflow.activeVersion)) {
      return "RENDERED";
    }
    if (this.repositories.visualSpecs.get(workflow.id, workflow.activeVersion)) {
      return "VISUAL_MATCHED";
    }
    if (this.repositories.deckPlans.get(workflow.id, workflow.activeVersion)) {
      return "DECK_GENERATED";
    }
    if (this.repositories.contentBriefs.get(workflow.id, workflow.activeVersion)) {
      return "BRIEFED";
    }
    if (this.repositories.parsedSources.get(workflow.id, workflow.activeVersion)) {
      return "PARSED";
    }

    return "INPUT_RECEIVED";
  }

  private deriveStatusFromReview(reviewResult: ReviewResult): WorkflowStageStatus {
    if (reviewResult.decision === "approve") {
      return "APPROVED";
    }
    if (reviewResult.decision === "block") {
      return "FAILED";
    }
    return "REWRITE_PENDING";
  }

  private deriveRuntimeStatus(workflow: WorkflowInstance): "running" | "waiting_signal" | "completed" | "failed" | null {
    const reviewResult = this.repositories.reviewResults.get(workflow.id, workflow.activeVersion);
    if (reviewResult) {
      if (reviewResult.decision === "approve") {
        return "completed";
      }
      if (reviewResult.decision === "block") {
        return "failed";
      }
      return "waiting_signal";
    }

    const stageRows = this.repositories.stageLogs.listByWorkflowIdAndVersion?.(workflow.id, workflow.activeVersion) ?? [];
    if (stageRows.some((row) => row.status === "error")) {
      return "failed";
    }
    if (stageRows.length > 0) {
      return "running";
    }
    return null;
  }

  private deriveCurrentStage(workflow: WorkflowInstance, status: WorkflowStageStatus): WorkflowStageStatus | null {
    if (status === "REWRITE_PENDING") {
      return "REVIEWED";
    }
    if (status === "APPROVED" || status === "FAILED") {
      const stageRows = this.repositories.stageLogs.listByWorkflowIdAndVersion?.(workflow.id, workflow.activeVersion) ?? [];
      const errorStage = stageRows.find((row) => row.status === "error")?.stageName;
      return errorStage ?? (status === "APPROVED" ? "APPROVED" : "FAILED");
    }

    return status;
  }

  private deriveLastErrorCode(workflow: WorkflowInstance) {
    const stageRows = this.repositories.stageLogs.listByWorkflowIdAndVersion?.(workflow.id, workflow.activeVersion) ?? [];
    return stageRows.find((row) => row.status === "error")?.errorCode ?? null;
  }

  private ensureRuntimeReady() {
    if (!this.temporalRuntime.isReady()) {
      throw new AppValidationError(
        createAppError("TEMPORAL_RUNTIME_UNAVAILABLE", "Temporal runtime is not ready.", {
          mode: this.temporalRuntime.getMode(),
          error: this.temporalRuntime.getLastError()
        })
      );
    }
  }

  private requireWorkflowInstance(workflowId: string) {
    const workflow = this.buildWorkflowInstance(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    return workflow;
  }

  private rollbackCreate(workflowId: string, versionNumber: number) {
    this.repositories.sourceInputs.deleteByWorkflowIdAndVersion?.(workflowId, versionNumber);
    this.repositories.workflowVersions.deleteByWorkflowId?.(workflowId);
  }

  private assertRewriteRequest(input: unknown) {
    const result = validateRewriteRequest(input);
    if (!result.success) {
      throw new AppValidationError(result.error);
    }

    return result.data;
  }
}
