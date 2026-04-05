import type { RewriteStage } from "@/modules/domain/types";

export type RunJobOptions = {
  resumeFromCurrentStatus?: boolean;
};

export type CreateJobInput = {
  urls?: string[];
  rawText?: string;
  notes?: string;
  targetAudience?: string;
  contentGoal?: string;
  preferredStyle?: string;
};

export type RewriteJobInput = {
  targetStage: RewriteStage;
  reason: string;
};
