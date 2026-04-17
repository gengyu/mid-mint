import path from "path";
import { fileURLToPath } from "url";
import { Client, WorkflowExecutionAlreadyStartedError } from "@temporalio/client";
import { NativeConnection, Worker } from "@temporalio/worker";
import type { WorkflowModules, WorkflowRepositories } from "@/application/jobs/job-runtime.types";
import type { RewriteStage } from "@/core/domain/types";
import { TemporalJobActivitiesImpl } from "./activities/job.activities";
import type { JobWorkflowRuntimeState } from "./workflows/types";

// ESM 模块里没有 CommonJS 的 __dirname，
// 所以这里通过 import.meta.url 转成文件路径，再拿到当前目录。
// 为什么这么写：
// Worker.create 里的 workflowsPath 需要一个真实的文件系统路径，
// 不能直接用 import.meta.url，也不能依赖 CommonJS 的 __dirname。
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 定义运行时模式：
// disabled = 没开启 Temporal
// ready = 已初始化完成，可正常使用
// error = 初始化失败或运行过程中出错
// 为什么这么写：
// 需要给上层一个明确、可判断的运行状态，避免上层只能靠 try/catch 猜测当前是否可用。
export type TemporalRuntimeMode = "disabled" | "ready" | "error";

// Temporal 的配置结构
type TemporalRuntimeConfig = {
  enabled: boolean;
  address: string;
  namespace: string;
  taskQueue: string;
};

export class TemporalWorkflowRuntime {
  // 保存运行时配置
  // 为什么这么写：
  // 把环境变量读取后的结果固化到 config，避免代码各处直接读取 process.env，
  // 这样更集中、更稳定，也更方便后续测试和排查问题。
  private readonly config: TemporalRuntimeConfig;

  // activities 的具体实现类
  // 为什么这么写：
  // workflow 只负责“编排流程”，真正的业务执行放到 activities 中，
  // 这样职责更清晰，也符合 Temporal 的设计习惯。
  private readonly activities: TemporalJobActivitiesImpl;

  // 到 Temporal Server 的底层连接
  // 为什么这么写：
  // Client 和 Worker 都依赖连接对象，单独保存可以复用同一连接。
  private connection: NativeConnection | null = null;

  // Temporal Client：负责启动 workflow、发 signal、查 query
  // 为什么这么写：
  // 对外操作 workflow 时要通过 Client，不能直接靠 Worker。
  private client: Client | null = null;

  // Temporal Worker：负责监听 taskQueue 并执行 workflow / activity
  // 为什么这么写：
  // Client 是“发起方”，Worker 是“执行方”，两者职责不同，需要分别管理。
  private worker: Worker | null = null;

  // 保存 worker.run() 的 Promise
  // 为什么这么写：
  // worker.run() 通常是持续运行的异步任务，把 Promise 存下来，便于追踪它是否异常退出。
  private workerPromise: Promise<void> | null = null;

  // 当前运行时模式
  // 为什么这么写：
  // 让整个类内部始终有一个统一的运行状态来源，而不是零散判断多个字段。
  private mode: TemporalRuntimeMode = "disabled";

  // 最近一次错误信息
  // 为什么这么写：
  // 上层可以直接取到错误原因，用于健康检查、接口返回或日志展示。
  private lastError: string | null = null;

  constructor(
    // 仓储依赖，用于查 job、更新 job 等
    private readonly repositories: WorkflowRepositories,
    // 业务模块依赖，比如模型调用、渲染模块等
    modules: WorkflowModules
  ) {
    // 初始化 activities
    // 为什么这么写：
    // activities 需要仓储层和业务模块，运行时统一注入，避免 activities 自己到处找依赖。
    this.activities = new TemporalJobActivitiesImpl(repositories, modules);

    // 从环境变量读取配置，没配则使用默认值
    // 为什么这么写：
    // 这样同一套代码可以在本地、测试、生产等不同环境运行，
    // 不需要改代码，只改环境变量即可。
    this.config = {
      enabled: process.env.TEMPORAL_ENABLED === "true",
      address: process.env.TEMPORAL_ADDRESS || "localhost:7233",
      namespace: process.env.TEMPORAL_NAMESPACE || "default",
      taskQueue: process.env.TEMPORAL_TASK_QUEUE || "mid-mint-job-queue"
    };
  }

  // 初始化整个 Temporal 运行时
  async init() {
    // 如果没有启用 Temporal，直接标记为 disabled
    // 为什么这么写：
    // 有些环境下可能不想启动 Temporal（例如本地简化模式、测试环境），
    // 这里提前返回，避免后续无意义地连接服务。
    if (!this.config.enabled) {
      this.mode = "disabled";
      return;
    }

    try {
      // 1. 创建到底层 Temporal Server 的连接
      // 为什么要先创建连接：
      // 不管是 Client 还是 Worker，都要先能连上 Temporal 服务，
      // 所以连接是最底层、最前置的依赖。
      this.connection = await NativeConnection.connect({
        address: this.config.address
      });

      // 2. 创建客户端
      // 为什么这么写：
      // Client 是“控制入口”，后面 start workflow、signal、query 都要靠它。
      // 先创建 Client，说明这个运行时后续不仅要“执行任务”，还要“操作任务”。
      this.client = new Client({
        connection: this.connection,
        namespace: this.config.namespace
      });

      // 3. 创建 Worker
      // 为什么这么写：
      // Worker 才是真正执行 workflow 和 activity 的执行器。
      // 没有 Worker，workflow 就算被 Client 启动了，也没人消费 taskQueue。
      this.worker = await Worker.create({
        connection: this.connection,
        namespace: this.config.namespace,
        taskQueue: this.config.taskQueue,

        // 指定 workflow 文件路径
        // 为什么这么写：
        // Worker 需要知道 workflow 的实现代码在哪里，
        // 这样收到任务后才能加载对应 workflow 来执行。
        workflowsPath: path.join(__dirname, "workflows", "job.workflow.ts"),

        // 注册 activity 实现
        // 为什么这么写：
        // workflow 中调用的是 activity 名称，
        // Worker 必须把这些名称映射到真正的函数实现上。
        // bind(this.activities) 是为了保证方法内部的 this 正确指向 activities 实例。
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

      // 4. 启动 Worker，开始持续监听 taskQueue
      // 为什么这么写：
      // worker.run() 一旦调用，就会进入持续运行状态；
      // 这里不 await，而是把 Promise 存起来，是因为初始化不能一直阻塞在这里。
      // 同时在 catch 里兜底，一旦 Worker 崩了，就把 mode 标成 error。
      this.workerPromise = this.worker.run().catch((error: unknown) => {
        this.mode = "error";
        this.lastError = error instanceof Error ? error.message : "Temporal worker crashed.";
        console.error("[temporal] worker stopped", error);
      });

      // 初始化成功后，标记为 ready
      // 为什么这么写：
      // 上层后续会通过 isReady() 或 mode 判断当前运行时能不能用。
      this.mode = "ready";
      this.lastError = null;
    } catch (error) {
      // 初始化失败时，记录错误并进入 error 状态
      // 为什么这么写：
      // Temporal 初始化可能失败在连接、客户端创建、Worker 创建任意一步，
      // 统一兜底后，上层就能拿到明确错误，而不是静默失败。
      this.mode = "error";
      this.lastError = error instanceof Error ? error.message : "Temporal initialization failed.";
      console.error("[temporal] initialization failed", error);
    }
  }

  // 获取当前模式
  // 为什么这么写：
  // 给外部最直接的运行状态读取入口，方便接口层、健康检查等使用。
  getMode() {
    return this.mode;
  }

  // 获取最近一次错误
  // 为什么这么写：
  // mode 只能看出“错了”，lastError 才能告诉你“为什么错”。
  getLastError() {
    return this.lastError;
  }

  // 判断当前运行时是否可用
  // 为什么这么写：
  // 仅仅 client 存在还不够，还要 mode === ready；
  // 双重判断比只判断某一个字段更稳妥。
  isReady() {
    return this.mode === "ready" && Boolean(this.client);
  }

  // 暴露 activities
  // 为什么这么写：
  // 有些场景下，系统可能不走 Temporal，而是直接调用 activities 做降级执行，
  // 这里提供统一访问口。
  getActivities() {
    return this.activities;
  }

  // 启动 workflow；如果已经启动过，则直接复用
  async startOrReuse(jobId: string) {
    const client = this.requireClient();

    try {
      await client.workflow.start("jobWorkflow", {
        taskQueue: this.config.taskQueue,

        // 用 jobId 作为 workflowId
        // 为什么这么写：
        // 这样同一个 job 天然只有一个 workflow 实例，
        // 可以保证幂等，避免重复启动同一个任务。
        workflowId: jobId,

        // 把 jobId 作为 workflow 参数传进去
        // 为什么这么写：
        // workflow 内部需要知道自己处理的是哪个 job。
        args: [jobId]
      });
    } catch (error) {
      // 如果这个 workflow 已经启动过，不当成错误处理
      // 为什么这么写：
      // 这里的方法语义就是“start or reuse”，
      // 所以遇到已存在的 workflow，应该视为正常情况而不是异常。
      if (!(error instanceof WorkflowExecutionAlreadyStartedError)) {
        throw error;
      }
    }

    // 启动后返回当前运行时状态
    // 为什么这么写：
    // 调用方通常希望立刻拿到这个 job 当前的 workflow 状态，而不是只知道“启动成功了”。
    return this.getRuntimeState(jobId);
  }

  // 请求某个阶段重写
  async requestRewrite(jobId: string, targetStage: RewriteStage, reason: string) {
    const client = this.requireClient();

    // 获取 workflow handle
    // 为什么这么写：
    // Temporal 对已存在 workflow 的 signal/query 操作，都通过 handle 进行。
    const handle = client.workflow.getHandle(jobId);

    // 向 workflow 发送 signal
    // 为什么这么写：
    // rewrite 是对“正在运行或已存在的 workflow”的控制动作，
    // 很适合用 signal，而不是重新 start 一个新的 workflow。
    await handle.signal("requestRewrite", {
      targetStage,
      reason
    });
  }

  // 查询 workflow 当前运行状态
  async getRuntimeState(jobId: string): Promise<JobWorkflowRuntimeState | null> {
    // 如果当前没准备好，直接返回 null
    // 为什么这么写：
    // 避免在 runtime 不可用时继续往下调用，减少无意义报错。
    if (!this.isReady()) {
      return null;
    }

    try {
      const client = this.requireClient();
      const handle = client.workflow.getHandle(jobId);

      // 调用 workflow 的 query 方法
      // 为什么这么写：
      // query 是读取 workflow 内部状态的标准方式，
      // 不会改变 workflow 状态，适合做状态查询。
      return await handle.query("getRuntimeState");
    } catch {
      // 查询失败时返回 null
      // 为什么这么写：
      // 这里更偏“容错式查询”接口，而不是强制抛错；
      // 调用方一般更关心“有没有状态”，而不是被异常打断流程。
      return null;
    }
  }

  // 等待指定版本号出现
  async waitForVersion(jobId: string, expectedVersion: number, timeoutMs = 5000) {
    const startedAt = Date.now();

    // 在限定时间内轮询 job 数据
    // 为什么这么写：
    // rewrite 这类动作通常不是瞬时完成的，
    // 这里通过短轮询等待 activeVersion 变更，给调用方一个同步式等待结果。
    while (Date.now() - startedAt < timeoutMs) {
      const job = this.repositories.jobs.getById(jobId);

      // 如果版本达到预期，立即返回
      // 为什么这么写：
      // 一旦目标条件满足，就没必要继续轮询，尽快返回结果。
      if (job?.activeVersion === expectedVersion) {
        return job;
      }

      // 每 200ms 轮询一次
      // 为什么这么写：
      // 轮询太频繁会浪费资源，太慢又影响响应速度；
      // 200ms 是一个比较折中的选择。
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // 超时后返回当前最新 job
    // 为什么这么写：
    // 即使没等到目标版本，也尽量把当前状态返回给调用方，而不是直接什么都不给。
    return this.repositories.jobs.getById(jobId);
  }

  // 内部方法：确保 client 已就绪
  private requireClient() {
    // 为什么这么写：
    // 把“检查 client 是否可用”的逻辑集中到一个地方，
    // 避免每个方法里重复写相同判断。
    if (!this.client || !this.isReady()) {
      throw new Error("Temporal runtime is not ready.");
    }

    return this.client;
  }
}