import { assertSourceInput, validateRewriteRequest } from "@/core/domain/validation";
import type { Job, JobStatus, RewriteRequest, ReviewResult, SourceInput } from "@/core/domain/types";
import type { WorkflowRepositories } from "@/application/jobs/job-runtime.types";
import type { CreateJobInput } from "@/application/jobs/job.types";
import { TemporalWorkflowRuntime } from "@/infra/runtime/temporal/temporal.runtime";
import { AppValidationError, createAppError } from "@/shared/errors/app-error";
import type { JobWorkflowRuntimeState } from "@/infra/runtime/temporal/workflows/types";

type WritableWorkflowRepositories = WorkflowRepositories & {
  jobs: WorkflowRepositories["jobs"] & {
    deleteById?: (jobId: string) => boolean;
  };
  jobVersions: WorkflowRepositories["jobVersions"] & {
    deleteByJobId?: (jobId: string) => number;
  };
  sourceInputs: WorkflowRepositories["sourceInputs"] & {
    deleteByJobIdAndVersion?: (jobId: string, versionNumber: number) => number;
  };
};

export class JobApplicationService {
  constructor(
    private readonly repositories: WritableWorkflowRepositories,
    private readonly temporalRuntime: TemporalWorkflowRuntime
  ) {}

  async createJob(input: CreateJobInput) {
    const sourceInput: SourceInput = assertSourceInput({
      urls: input.urls ?? [],
      rawText: input.rawText ?? "",
      notes: input.notes ?? "",
      targetAudience: input.targetAudience ?? "",
      contentGoal: input.contentGoal ?? "",
      preferredStyle: input.preferredStyle ?? ""
    });

    this.ensureRuntimeReady();

    const job = this.repositories.jobs.create(sourceInput);
    try {
      this.repositories.jobVersions.create({
        jobId: job.id,
        versionNumber: job.activeVersion,
        trigger: "initial",
        rewriteStage: null
      });
      this.repositories.sourceInputs.save(job.id, job.activeVersion, sourceInput);

      const runState = await this.startRun(job.id);
      const currentJob = this.requireJob(job.id);

      return {
        jobId: currentJob.id,
        status: "INPUT_RECEIVED" as const,
        activeVersion: currentJob.activeVersion,
        runtimeStatus: runState.runtimeStatus,
        currentStage: runState.currentStage
      };
    } catch (error) {
      this.rollbackCreate(job.id, job.activeVersion);
      throw error;
    }
  }

  async requestRewrite(jobId: string, input: Omit<RewriteRequest, "jobId">) {
    const request = this.assertRewriteRequest({
      jobId,
      targetStage: input.targetStage,
      reason: input.reason
    });

    this.ensureRuntimeReady();

    const job = this.requireJob(request.jobId);
    const runtimeState = await this.temporalRuntime.getRuntimeState(request.jobId);
    if (runtimeState?.runtimeStatus !== "waiting_signal") {
      throw new AppValidationError(
        createAppError(
          "REWRITE_NOT_AVAILABLE",
          "Current job is not waiting for rewrite."
        )
      );
    }

    await this.temporalRuntime.requestRewrite(request.jobId, request.targetStage, request.reason);

    const updated = await this.temporalRuntime.waitForVersion(request.jobId, job.activeVersion + 1);
    const nextJob = updated ?? this.requireJob(request.jobId);

    return {
      jobId: nextJob.id,
      status: this.deriveStatus(nextJob, runtimeState ?? null),
      activeVersion: nextJob.activeVersion
    };
  }

  async getJob(jobId: string) {
    const job = this.repositories.jobs.getById(jobId);
    if (!job) {
      return null;
    }

    return this.decorateJob(job);
  }

  async listJobs() {
    const jobs = this.repositories.jobs.list();
    return Promise.all(jobs.map((job) => this.decorateJob(job)));
  }

  async getJobVersion(jobId: string, versionNumber: number) {
    const job = this.repositories.jobs.getById(jobId);
    return {
      job: job ? await this.decorateJob(job) : null,
      sourceInput: this.repositories.sourceInputs.get(jobId, versionNumber),
      parsedSource: this.repositories.parsedSources.get(jobId, versionNumber),
      contentBrief: this.repositories.contentBriefs.get(jobId, versionNumber),
      deckPlan: this.repositories.deckPlans.get(jobId, versionNumber),
      visualSpec: this.repositories.visualSpecs.get(jobId, versionNumber),
      renderResult: this.repositories.renderResults.get(jobId, versionNumber),
      reviewResult: this.repositories.reviewResults.get(jobId, versionNumber),
      stageMeta: this.getStageMeta(jobId, versionNumber)
    };
  }

  private async startRun(jobId: string) {
    this.ensureRuntimeReady();

    const runtimeState = await this.temporalRuntime.startOrReuse(jobId);
    const job = this.requireJob(jobId);

    return {
      jobId: job.id,
      status: "INPUT_RECEIVED" as const,
      runtimeStatus: runtimeState?.runtimeStatus ?? null,
      currentStage: runtimeState?.currentStage ?? null
    };
  }

  private async decorateJob(job: Job) {
    const runtimeState = this.temporalRuntime.isReady()
      ? await this.temporalRuntime.getRuntimeState(job.id)
      : null;
    const derivedStatus = this.deriveStatus(job, runtimeState);
    const derivedRuntimeStatus = runtimeState?.runtimeStatus ?? this.deriveRuntimeStatus(job);

    return {
      ...job,
      jobId: job.id,
      status: derivedStatus,
      runtimeStatus: derivedRuntimeStatus,
      currentStage: runtimeState?.currentStage ?? this.deriveCurrentStage(job, derivedStatus),
      runtimeVersion: runtimeState?.currentVersion ?? job.activeVersion,
      lastErrorCode: runtimeState?.lastErrorCode ?? this.deriveLastErrorCode(job),
      pendingRewrite: runtimeState?.pendingRewrite ?? derivedStatus === "REWRITE_PENDING",
      temporalMode: this.temporalRuntime.getMode(),
      temporalError: this.temporalRuntime.getLastError()
    };
  }

  private getStageMeta(jobId: string, versionNumber: number) {
    const rows = this.repositories.stageLogs.listByJobIdAndVersion?.(jobId, versionNumber) ?? [];
    const stageOrder: JobStatus[] = [
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

  private deriveStatus(job: Job, runtimeState: JobWorkflowRuntimeState | null): JobStatus {
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

    const reviewResult = this.repositories.reviewResults.get(job.id, job.activeVersion);
    if (reviewResult) {
      return this.deriveStatusFromReview(reviewResult);
    }

    if (this.repositories.renderResults.get(job.id, job.activeVersion)) {
      return "RENDERED";
    }
    if (this.repositories.visualSpecs.get(job.id, job.activeVersion)) {
      return "VISUAL_MATCHED";
    }
    if (this.repositories.deckPlans.get(job.id, job.activeVersion)) {
      return "DECK_GENERATED";
    }
    if (this.repositories.contentBriefs.get(job.id, job.activeVersion)) {
      return "BRIEFED";
    }
    if (this.repositories.parsedSources.get(job.id, job.activeVersion)) {
      return "PARSED";
    }

    return "INPUT_RECEIVED";
  }

  private deriveStatusFromReview(reviewResult: ReviewResult): JobStatus {
    if (reviewResult.decision === "approve") {
      return "APPROVED";
    }
    if (reviewResult.decision === "block") {
      return "FAILED";
    }
    return "REWRITE_PENDING";
  }

  private deriveRuntimeStatus(job: Job): "running" | "waiting_signal" | "completed" | "failed" | null {
    const reviewResult = this.repositories.reviewResults.get(job.id, job.activeVersion);
    if (reviewResult) {
      if (reviewResult.decision === "approve") {
        return "completed";
      }
      if (reviewResult.decision === "block") {
        return "failed";
      }
      return "waiting_signal";
    }

    const stageRows = this.repositories.stageLogs.listByJobIdAndVersion?.(job.id, job.activeVersion) ?? [];
    if (stageRows.some((row) => row.status === "error")) {
      return "failed";
    }
    if (stageRows.length > 0) {
      return "running";
    }
    return null;
  }

  private deriveCurrentStage(job: Job, status: JobStatus): JobStatus | null {
    if (status === "REWRITE_PENDING") {
      return "REVIEWED";
    }
    if (status === "APPROVED" || status === "FAILED") {
      const stageRows = this.repositories.stageLogs.listByJobIdAndVersion?.(job.id, job.activeVersion) ?? [];
      const errorStage = stageRows.find((row) => row.status === "error")?.stageName;
      return errorStage ?? (status === "APPROVED" ? "APPROVED" : "FAILED");
    }

    return status;
  }

  private deriveLastErrorCode(job: Job) {
    const stageRows = this.repositories.stageLogs.listByJobIdAndVersion?.(job.id, job.activeVersion) ?? [];
    return stageRows.find((row) => row.status === "error")?.errorCode ?? null;
  }

  private ensureRuntimeReady() {
    if (!this.temporalRuntime.isReady()) {
      throw new AppValidationError(
        createAppError(
          "TEMPORAL_RUNTIME_UNAVAILABLE",
          "Temporal runtime is not ready.",
          {
            mode: this.temporalRuntime.getMode(),
            error: this.temporalRuntime.getLastError()
          }
        )
      );
    }
  }

  private requireJob(jobId: string) {
    const job = this.repositories.jobs.getById(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return job;
  }

  private rollbackCreate(jobId: string, versionNumber: number) {
    this.repositories.sourceInputs.deleteByJobIdAndVersion?.(jobId, versionNumber);
    this.repositories.jobVersions.deleteByJobId?.(jobId);
    this.repositories.jobs.deleteById?.(jobId);
  }

  private assertRewriteRequest(input: unknown) {
    const result = validateRewriteRequest(input);
    if (!result.success) {
      throw new AppValidationError(result.error);
    }

    return result.data;
  }
}
