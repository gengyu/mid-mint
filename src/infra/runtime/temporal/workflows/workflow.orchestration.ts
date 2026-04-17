import { condition, defineQuery, defineSignal, proxyActivities, setHandler } from "@temporalio/workflow";
import type { WorkflowStageStatus } from "@/core/domain/types";
import type { TemporalWorkflowActivities } from "../activities/workflow.activities";
import type { RewriteSignalPayload, WorkflowRuntimeState } from "./types";

export const requestRewriteSignal = defineSignal<[RewriteSignalPayload]>("requestRewrite");
export const getRuntimeStateQuery = defineQuery<WorkflowRuntimeState>("getRuntimeState");

const activities = proxyActivities<TemporalWorkflowActivities>({
  startToCloseTimeout: "10 minutes",
  retry: {
    maximumAttempts: 2
  }
});

export async function workflowOrchestration(workflowId: string): Promise<void> {
  let pendingRewrite: RewriteSignalPayload | null = null;
  const runtimeState: WorkflowRuntimeState = {
    workflowId,
    currentVersion: null,
    currentStage: "INPUT_RECEIVED",
    runtimeStatus: "running",
    lastErrorCode: null,
    pendingRewrite: false
  };

  const setStage = (stage: WorkflowStageStatus | null, status: WorkflowRuntimeState["runtimeStatus"]) => {
    runtimeState.currentStage = stage;
    runtimeState.runtimeStatus = status;
  };

  setHandler(requestRewriteSignal, (payload) => {
    pendingRewrite = payload;
    runtimeState.pendingRewrite = true;
  });

  setHandler(getRuntimeStateQuery, () => runtimeState);

  while (true) {
    const workflow = await activities.loadWorkflowInstance(workflowId);
    runtimeState.currentVersion = workflow.activeVersion;
    runtimeState.lastErrorCode = null;

    setStage("PARSED", "running");
    await activities.executeParsedStage(workflowId, workflow.activeVersion);

    setStage("BRIEFED", "running");
    await activities.executeBriefStage(workflowId, workflow.activeVersion);

    setStage("DECK_GENERATED", "running");
    await activities.executeDeckStage(workflowId, workflow.activeVersion);

    setStage("VISUAL_MATCHED", "running");
    await activities.executeVisualStage(workflowId, workflow.activeVersion);

    setStage("RENDERED", "running");
    await activities.executeRenderStage(workflowId, workflow.activeVersion);

    setStage("REVIEWED", "running");
    await activities.executeReviewStage(workflowId, workflow.activeVersion);

    const finalized = await activities.finalizeReview(workflowId, workflow.activeVersion);
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
    pendingRewrite = null;
    runtimeState.pendingRewrite = false;

    if (!rewrite) {
      continue;
    }

    const nextVersion = await activities.createRewriteVersion(workflowId, rewrite.targetStage, rewrite.reason);
    runtimeState.currentVersion = nextVersion;
  }
}
