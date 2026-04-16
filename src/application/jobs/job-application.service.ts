import { assertSourceInput, validateRewriteRequest } from "@/core/domain/validation";
import type { Job, JobStatus, RewriteRequest, SourceInput } from "@/core/domain/types";
import type { WorkflowRepositories } from "@/application/jobs/job-runtime.types";
import type { CreateJobInput } from "@/application/jobs/job.types";
import { TemporalWorkflowRuntime } from "@/infra/runtime/temporal/temporal.runtime";
import { AppValidationError, createAppError } from "@/shared/errors/app-error";

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
        status: currentJob.status,
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
    if (job.status !== "REWRITE_PENDING") {
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
      status: nextJob.status,
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

  getJobVersion(jobId: string, versionNumber: number) {
    return {
      job: this.repositories.jobs.getById(jobId),
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
      status: job.status,
      runtimeStatus: runtimeState?.runtimeStatus ?? null,
      currentStage: runtimeState?.currentStage ?? null
    };
  }

  private async decorateJob(job: Job) {
    const runtimeState = this.temporalRuntime.isReady()
      ? await this.temporalRuntime.getRuntimeState(job.id)
      : null;
    const derivedRuntimeStatus = job.status === "REWRITE_PENDING"
      ? "waiting_signal"
      : job.status === "FAILED"
        ? "failed"
        : job.status === "APPROVED"
          ? "completed"
          : null;

    return {
      ...job,
      jobId: job.id,
      runtimeStatus: runtimeState?.runtimeStatus ?? derivedRuntimeStatus,
      currentStage: runtimeState?.currentStage ?? this.toCurrentStage(job.status),
      runtimeVersion: runtimeState?.currentVersion ?? job.activeVersion,
      lastErrorCode: runtimeState?.lastErrorCode ?? null,
      pendingRewrite: runtimeState?.pendingRewrite ?? false,
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

  private toCurrentStage(status: JobStatus): JobStatus | null {
    if (status === "APPROVED" || status === "FAILED" || status === "REWRITE_PENDING") {
      return status;
    }

    return [
      "INPUT_RECEIVED",
      "PARSED",
      "BRIEFED",
      "DECK_GENERATED",
      "VISUAL_MATCHED",
      "RENDERED",
      "REVIEWED"
    ].includes(status) ? status : null;
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
