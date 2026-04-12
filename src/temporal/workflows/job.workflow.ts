import { condition, defineQuery, defineSignal, proxyActivities, setHandler } from "@temporalio/workflow";
import type { JobStatus } from "../../modules/domain/types";
import type { TemporalJobActivities } from "../activities/job.activities";
import type { JobWorkflowRuntimeState, RewriteSignalPayload } from "./types";

export const requestRewriteSignal = defineSignal<[RewriteSignalPayload]>("requestRewrite");
export const getRuntimeStateQuery = defineQuery<JobWorkflowRuntimeState>("getRuntimeState");

const activities = proxyActivities<TemporalJobActivities>({
  startToCloseTimeout: "10 minutes",
  retry: {
    maximumAttempts: 2
  }
});

export async function jobWorkflow(jobId: string): Promise<void> {
  let pendingRewrite: RewriteSignalPayload | null = null;
  const runtimeState: JobWorkflowRuntimeState = {
    jobId,
    currentVersion: null,
    currentStage: null,
    runtimeStatus: "running",
    lastErrorCode: null,
    pendingRewrite: false
  };

  const setStage = (stage: JobStatus | null, status: JobWorkflowRuntimeState["runtimeStatus"]) => {
    runtimeState.currentStage = stage;
    runtimeState.runtimeStatus = status;
  };

  setHandler(requestRewriteSignal, (payload) => {
    pendingRewrite = payload;
    runtimeState.pendingRewrite = true;
  });

  setHandler(getRuntimeStateQuery, () => runtimeState);

  while (true) {
    const job = await activities.loadJob(jobId);
    runtimeState.currentVersion = job.activeVersion;
    runtimeState.lastErrorCode = null;

    if (job.status === "APPROVED") {
      setStage("APPROVED", "completed");
      return;
    }

    setStage("PARSED", "running");
    await activities.runParsedStage(jobId, job.activeVersion);

    setStage("BRIEFED", "running");
    await activities.runBriefStage(jobId, job.activeVersion);

    setStage("DECK_GENERATED", "running");
    await activities.runDeckStage(jobId, job.activeVersion);

    setStage("VISUAL_MATCHED", "running");
    await activities.runVisualStage(jobId, job.activeVersion);

    setStage("RENDERED", "running");
    await activities.runRenderStage(jobId, job.activeVersion);

    setStage("REVIEWED", "running");
    await activities.runReviewStage(jobId, job.activeVersion);

    const finalized = await activities.finalizeReview(jobId, job.activeVersion);
    runtimeState.lastErrorCode = finalized.errorCode;

    if (finalized.status === "APPROVED") {
      setStage("APPROVED", "completed");
      runtimeState.pendingRewrite = false;
      return;
    }

    if (finalized.status === "FAILED") {
      setStage("FAILED", "failed");
      runtimeState.pendingRewrite = false;
      return;
    }

    setStage("REWRITE_PENDING", "waiting_signal");
    await condition(() => pendingRewrite !== null);

    const rewrite = pendingRewrite as RewriteSignalPayload | null;
    const rewriteTargetStage = rewrite?.targetStage;
    const rewriteReason = rewrite?.reason;
    pendingRewrite = null;
    runtimeState.pendingRewrite = false;

    if (rewriteTargetStage === undefined || rewriteReason === undefined) {
      continue;
    }

    const nextVersion = await activities.createRewriteVersion(jobId, rewriteTargetStage, rewriteReason);
    runtimeState.currentVersion = nextVersion;
  }
}
