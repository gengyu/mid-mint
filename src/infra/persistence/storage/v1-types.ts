import type { RewriteStage, WorkflowStageStatus } from "@/core/domain/types";

export type JsonTableRow = {
  id: string;
  createdAt: string;
};

export type WorkflowVersionRecord = {
  id: string;
  workflowId: string;
  versionNumber: number;
  trigger: "initial" | "rewrite";
  rewriteStage: RewriteStage | null;
  createdAt: string;
};

export type ArtifactRecord<TPayload> = {
  id: string;
  workflowId: string;
  versionNumber: number;
  payloadJson: string;
  createdAt: string;
  payload?: TPayload;
};

export type StageLogRecord = {
  id: string;
  workflowId: string;
  versionNumber: number;
  stageName: WorkflowStageStatus;
  startedAt: string;
  finishedAt: string;
  status: "success" | "error";
  model: string | null;
  usedLlm: boolean;
  llmAttempted: boolean;
  retryOccurred: boolean;
  usedFallback: boolean;
  durationMs: number;
  errorCode: string | null;
  errorMessage: string | null;
};

export type RewriteLogRecord = {
  id: string;
  workflowId: string;
  fromVersion: number;
  toVersion: number;
  targetStage: RewriteStage;
  reason: string;
  createdAt: string;
};
