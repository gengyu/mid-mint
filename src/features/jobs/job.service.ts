import { assertSourceInput } from "@/core/domain/validation";
import type { Job, SourceInput } from "@/core/domain/types";
import type { WorkflowOrchestrator, WorkflowRepositories } from "@/features/jobs/orchestrator";
import type { CreateJobInput } from "@/features/jobs/job.types";
import { TemporalWorkflowRuntime } from "@/infra/runtime/temporal/temporal.runtime";

export class JobsService {
  private readonly activeRuns = new Map<string, Promise<Job>>();

  constructor(
    private readonly orchestrator: WorkflowOrchestrator,
    private readonly repositories: WorkflowRepositories,
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

    const job = this.repositories.jobs.create(sourceInput);
    this.repositories.jobVersions.create({
      jobId: job.id,
      versionNumber: job.activeVersion,
      trigger: "initial",
      rewriteStage: null
    });
    this.repositories.sourceInputs.save(job.id, job.activeVersion, sourceInput);

    const runState = await this.startRun(job.id);

    return {
      jobId: job.id,
      status: job.status,
      activeVersion: job.activeVersion,
      runtimeStatus: "runtimeStatus" in runState ? runState.runtimeStatus : null,
      currentStage: "currentStage" in runState ? runState.currentStage : null
    };
  }

  private async startRun(jobId: string) {
    if (this.temporalRuntime.isReady()) {
      const runtimeState = await this.temporalRuntime.startOrReuse(jobId);
      const job = this.orchestrator.getJob(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }

      return {
        jobId: job.id,
        status: job.status,
        runtimeStatus: runtimeState?.runtimeStatus ?? null,
        currentStage: runtimeState?.currentStage ?? null
      };
    }

    const existingRun = this.activeRuns.get(jobId);
    if (!existingRun) {
      const runPromise = this.orchestrator
        .run(jobId)
        .finally(() => {
          this.activeRuns.delete(jobId);
        });
      this.activeRuns.set(jobId, runPromise);
    }

    const job = this.orchestrator.getJob(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    return {
      jobId: job.id,
      status: job.status
    };
  }

  async getJob(jobId: string) {
    const job = this.orchestrator.getJob(jobId);
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
    return this.orchestrator.getVersionArtifacts(jobId, versionNumber);
  }

  private async decorateJob(job: Job) {
    const runtimeState = this.temporalRuntime.isReady()
      ? await this.temporalRuntime.getRuntimeState(job.id)
      : null;
    const legacyRuntimeStatus = this.activeRuns.has(job.id)
      ? "running"
      : job.status === "REWRITE_PENDING"
        ? "waiting_signal"
        : job.status === "FAILED"
          ? "failed"
          : job.status === "APPROVED"
          ? "completed"
          : null;

    return {
      ...job,
      jobId: job.id,
      runtimeStatus: runtimeState?.runtimeStatus
        ?? legacyRuntimeStatus
        ?? (this.temporalRuntime.getMode() === "error" ? "legacy_fallback" : null),
      currentStage: runtimeState?.currentStage ?? (this.activeRuns.has(job.id) ? job.status : null),
      runtimeVersion: runtimeState?.currentVersion ?? (this.activeRuns.has(job.id) ? job.activeVersion : null),
      lastErrorCode: runtimeState?.lastErrorCode ?? null,
      pendingRewrite: runtimeState?.pendingRewrite ?? false,
      temporalMode: this.temporalRuntime.getMode(),
      temporalError: this.temporalRuntime.getLastError()
    };
  }
}
