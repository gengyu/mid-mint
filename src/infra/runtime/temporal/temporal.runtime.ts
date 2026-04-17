import path from "path";
import { fileURLToPath } from "url";
import { Client, WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { NativeConnection, Worker } from "@temporalio/worker";
import type { WorkflowModules, WorkflowRepositories } from "@/application/workflows/workflow-runtime.types";
import type { RewriteStage } from "@/core/domain/types";
import { TemporalWorkflowActivitiesImpl } from "./activities/workflow.activities";
import type { WorkflowRuntimeState } from "./workflows/types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type TemporalRuntimeMode = "disabled" | "ready" | "error";

type TemporalRuntimeConfig = {
  enabled: boolean;
  address: string;
  namespace: string;
  taskQueue: string;
};

export class TemporalWorkflowRuntime {
  private readonly config: TemporalRuntimeConfig;
  private readonly activities: TemporalWorkflowActivitiesImpl;
  private connection: NativeConnection | null = null;
  private client: Client | null = null;
  private worker: Worker | null = null;
  private workerPromise: Promise<void> | null = null;
  private mode: TemporalRuntimeMode = "disabled";
  private lastError: string | null = null;

  constructor(
    private readonly repositories: WorkflowRepositories,
    modules: WorkflowModules
  ) {
    this.activities = new TemporalWorkflowActivitiesImpl(repositories, modules);
    this.config = {
      enabled: process.env.TEMPORAL_ENABLED === "true",
      address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
      namespace: process.env.TEMPORAL_NAMESPACE || "default",
      taskQueue: process.env.TEMPORAL_TASK_QUEUE || "mid-mint-workflow-queue"
    };
  }

  async init() {
    if (!this.config.enabled) {
      this.mode = "disabled";
      return;
    }

    try {
      this.connection = await NativeConnection.connect({
        address: this.config.address
      });
      this.client = new Client({
        connection: this.connection,
        namespace: this.config.namespace
      });
      this.worker = await Worker.create({
        connection: this.connection,
        namespace: this.config.namespace,
        taskQueue: this.config.taskQueue,
        workflowsPath: path.join(__dirname, "workflows", "workflow.orchestration.ts"),
        activities: {
          loadWorkflowInstance: this.activities.loadWorkflowInstance.bind(this.activities),
          executeParsedStage: this.activities.executeParsedStage.bind(this.activities),
          executeBriefStage: this.activities.executeBriefStage.bind(this.activities),
          executeDeckStage: this.activities.executeDeckStage.bind(this.activities),
          executeVisualStage: this.activities.executeVisualStage.bind(this.activities),
          executeRenderStage: this.activities.executeRenderStage.bind(this.activities),
          executeReviewStage: this.activities.executeReviewStage.bind(this.activities),
          finalizeReview: this.activities.finalizeReview.bind(this.activities),
          createRewriteVersion: this.activities.createRewriteVersion.bind(this.activities)
        }
      });

      this.workerPromise = this.worker.run().catch((error: unknown) => {
        this.mode = "error";
        this.lastError = error instanceof Error ? error.message : "Temporal worker crashed.";
        console.error("[temporal] worker stopped", error);
      });

      this.mode = "ready";
      this.lastError = null;
    } catch (error) {
      this.mode = "error";
      this.lastError = error instanceof Error ? error.message : "Temporal initialization failed.";
      console.error("[temporal] initialization failed", error);
    }
  }

  getMode() {
    return this.mode;
  }

  getLastError() {
    return this.lastError;
  }

  isReady() {
    return this.mode === "ready" && Boolean(this.client);
  }

  getActivities() {
    return this.activities;
  }

  async startOrReuse(workflowId: string) {
    const client = this.requireClient();

    try {
      await client.workflow.start("workflowOrchestration", {
        taskQueue: this.config.taskQueue,
        workflowId,
        args: [workflowId]
      });
    } catch (error) {
      if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
        throw error;
      }
    }

    return this.getRuntimeState(workflowId);
  }

  async requestRewrite(workflowId: string, targetStage: RewriteStage, reason: string) {
    const client = this.requireClient();
    const handle = client.workflow.getHandle(workflowId);
    await handle.signal("requestRewrite", {
      targetStage,
      reason
    });
  }

  async getRuntimeState(workflowId: string): Promise<WorkflowRuntimeState | null> {
    const client = this.requireClient();

    try {
      const handle = client.workflow.getHandle(workflowId);
      return await handle.query<WorkflowRuntimeState>("getRuntimeState");
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return null;
      }
      throw error;
    }
  }

  async waitForVersion(workflowId: string, expectedVersion: number, timeoutMs = 5000) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const version = this.repositories.workflowVersions.listByWorkflowId(workflowId)[0] ?? null;
      if (version?.versionNumber === expectedVersion) {
        return version.versionNumber;
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return this.repositories.workflowVersions.listByWorkflowId(workflowId)[0]?.versionNumber ?? null;
  }

  private requireClient() {
    if (!this.client || this.mode !== "ready") {
      throw new Error("Temporal client is not ready.");
    }

    return this.client;
  }
}
