import type { Job, JobStatus, RewriteStage } from "@/core/domain/types";
import type { WorkflowModules, WorkflowRepositories } from "@/application/jobs/job-runtime.types";
import { JobStageRunner } from "@/stages/job-stage-runner";

type ReviewFinalization = {
  status: JobStatus;
  errorCode: string | null;
};

export interface TemporalJobActivities {
  loadJob(jobId: string): Promise<Job>;
  runParsedStage(jobId: string, versionNumber: number): Promise<void>;
  runBriefStage(jobId: string, versionNumber: number): Promise<void>;
  runDeckStage(jobId: string, versionNumber: number): Promise<void>;
  runVisualStage(jobId: string, versionNumber: number): Promise<void>;
  runRenderStage(jobId: string, versionNumber: number): Promise<void>;
  runReviewStage(jobId: string, versionNumber: number): Promise<void>;
  finalizeReview(jobId: string, versionNumber: number): Promise<ReviewFinalization>;
  createRewriteVersion(jobId: string, targetStage: RewriteStage, reason: string): Promise<number>;
}

export class TemporalJobActivitiesImpl extends JobStageRunner implements TemporalJobActivities {
  constructor(
    repositories: WorkflowRepositories,
    modules: WorkflowModules
  ) {
    super(repositories, modules);
  }
}
