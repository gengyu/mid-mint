import type { RewriteStage, WorkflowStageStatus } from "@/core/domain/types";

export type WorkflowRuntimeStatus =
  | "running"
  | "waiting_signal"
  | "completed"
  | "failed";

export type WorkflowRuntimeState = {
  workflowId: string;
  currentVersion: number | null;
  currentStage: WorkflowStageStatus | null;
  runtimeStatus: WorkflowRuntimeStatus;
  lastErrorCode: string | null;
  pendingRewrite: boolean;
};

export type RewriteSignalPayload = {
  targetStage: RewriteStage;
  reason: string;
};
