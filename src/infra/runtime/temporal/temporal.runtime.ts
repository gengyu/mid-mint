import path from "path";
import { fileURLToPath } from "url";
import { Client, WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { NativeConnection, Worker } from "@temporalio/worker";
import type { RewriteStage } from "@/core/domain/types";
import type { WorkflowModules, WorkflowRepositories } from "@/features/jobs/orchestrator";
import { TemporalJobActivitiesImpl } from "./activities/job.activities";
import type { JobWorkflowRuntimeState } from "./workflows/types";

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
  private readonly activities: TemporalJobActivitiesImpl;
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
    this.activities = new TemporalJobActivitiesImpl(repositories, modules);
    this.config = {
      enabled: process.env.TEMPORAL_ENABLED === "true",
      address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
      namespace: process.env.TEMPORAL_NAMESPACE || "default",
      taskQueue: process.env.TEMPORAL_TASK_QUEUE || "mid-mint-job-queue"
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
        workflowsPath: path.join(__dirname, "workflows", "job.workflow.ts"),
        activities: {
          loadJob: this.activities.loadJob.bind(this.activities),
          runParsedStage: this.activities.runParsedStage.bind(this.activities),
          runBriefStage: this.activities.runBriefStage.bind(this.activities),
          runDeckStage: this.activities.runDeckStage.bind(this.activities),
          runVisualStage: this.activities.runVisualStage.bind(this.activities),
          runRenderStage: this.activities.runRenderStage.bind(this.activities),
          runReviewStage: this.activities.runReviewStage.bind(this.activities),
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
      console.error("[temporal] initialization failed; falling back to legacy orchestrator", error);
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

  async startOrReuse(jobId: string) {
    const client = this.requireClient();

    try {
      await client.workflow.start("jobWorkflow", {
        taskQueue: this.config.taskQueue,
        workflowId: jobId,
        args: [jobId]
      });
    } catch (error) {
      if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
        throw error;
      }
    }

    return this.getRuntimeState(jobId);
  }

  async requestRewrite(jobId: string, targetStage: RewriteStage, reason: string) {
    const client = this.requireClient();
    const handle = client.workflow.getHandle(jobId);
    await handle.signal("requestRewrite", {
      targetStage,
      reason
    });
  }

  async getRuntimeState(jobId: string): Promise<JobWorkflowRuntimeState | null> {
    if (!this.isReady()) {
      return null;
    }

    try {
      const client = this.requireClient();
      const handle = client.workflow.getHandle(jobId);
      return await handle.query("getRuntimeState");
    } catch {
      return null;
    }
  }

  async waitForVersion(jobId: string, expectedVersion: number, timeoutMs = 5000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const job = this.repositories.jobs.getById(jobId);
      if (job?.activeVersion === expectedVersion) {
        return job;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return this.repositories.jobs.getById(jobId);
  }

  private requireClient() {
    if (!this.client || !this.isReady()) {
      throw new Error("Temporal runtime is not ready.");
    }

    return this.client;
  }
}
