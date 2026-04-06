import type { JobStatus, RewriteStage } from "@/modules/domain/types";

export type JsonTableRow = {
  id: string;
  createdAt: string;
};

export type JobRecord = {
  id: string;
  status: JobStatus;
  rewriteCount: number;
  activeVersion: number;
  createdAt: string;
  updatedAt: string;
};

export type JobVersionRecord = {
  id: string;
  jobId: string;
  versionNumber: number;
  trigger: "initial" | "rewrite";
  rewriteStage: RewriteStage | null;
  createdAt: string;
};

export type ArtifactRecord<TPayload> = {
  id: string;
  jobId: string;
  versionNumber: number;
  payloadJson: string;
  createdAt: string;
  payload?: TPayload;
};

export type StageLogRecord = {
  id: string;
  jobId: string;
  versionNumber: number;
  stageName: JobStatus;
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
  jobId: string;
  fromVersion: number;
  toVersion: number;
  targetStage: RewriteStage;
  reason: string;
  createdAt: string;
};
