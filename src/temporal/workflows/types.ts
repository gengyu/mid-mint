import type { JobStatus, RewriteStage } from "../../modules/domain/types";

export type JobWorkflowRuntimeStatus =
  | "running"
  | "waiting_signal"
  | "completed"
  | "failed";

export type JobWorkflowRuntimeState = {
  jobId: string;
  currentVersion: number | null;
  currentStage: JobStatus | null;
  runtimeStatus: JobWorkflowRuntimeStatus;
  lastErrorCode: string | null;
  pendingRewrite: boolean;
};

export type RewriteSignalPayload = {
  targetStage: RewriteStage;
  reason: string;
};

