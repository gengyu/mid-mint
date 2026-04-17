# Temporal Workflow

## 概览

当前服务端已经收敛为一套以 Temporal 为唯一流程编排器的工作流。

核心原则：

- Temporal workflow 负责流程推进和运行态管理
- Temporal activities 负责每个阶段的副作用执行
- `src/features/generation/*` 负责各阶段的业务实现
- 数据库存储业务产物和审计日志，不再维护独立的流程状态机

当前主链路：

`create job -> jobWorkflow -> parse -> brief -> deck -> visual -> render -> review -> approve / rewrite / fail`

## 代码入口

### API 入口

- `POST /api/jobs`
  文件：`src/app/jobs/jobs.controller.ts`
- `POST /api/jobs/:jobId/rewrite`
  文件：`src/app/jobs/jobs.controller.ts`
- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `GET /api/jobs/:jobId/versions/:version`

控制器只做请求转发，真正的业务入口是：

- `src/application/jobs/job-application.service.ts`

### Runtime 入口

Temporal runtime 初始化和 worker 注册在：

- `src/infra/runtime/temporal/temporal.runtime.ts`

这里会：

- 创建 Temporal client
- 创建 Temporal worker
- 注册 workflow 文件
- 注册 activities 实现

### Workflow 入口

实际的工作流定义在：

- `src/infra/runtime/temporal/workflows/job.workflow.ts`

它是当前唯一的流程编排器。

## 职责分层

### 1. Workflow 层

文件：

- `src/infra/runtime/temporal/workflows/job.workflow.ts`

职责：

- 定义完整阶段顺序
- 维护 workflow 内部运行态
- 处理 rewrite signal
- 决定 approve / rewrite_pending / failed
- 在 worker 重启后依赖 Temporal replay 恢复流程状态

workflow 内部维护的关键状态：

- `currentVersion`
- `currentStage`
- `runtimeStatus`
- `lastErrorCode`
- `pendingRewrite`

### 2. Activities 层

文件：

- `src/infra/runtime/temporal/activities/job.activities.ts`

职责：

- 读取当前 version 所需输入
- 调用 generation 模块执行单阶段逻辑
- 校验阶段输出
- 持久化阶段产物
- 记录 stage logs
- 处理 rewrite 版本创建和产物复制

可以理解为：

- workflow 决定“下一步做什么”
- activities 决定“这一步怎么执行并落盘”

### 3. Generation 模块层

目录：

- `src/features/generation/source`
- `src/features/generation/brief`
- `src/features/generation/deck`
- `src/features/generation/visual`
- `src/features/generation/render`
- `src/features/generation/review`

职责：

- 专注单阶段业务逻辑
- 不负责流程推进
- 不负责任务状态机

当前主要方法：

- `SourceParser.parse()`
- `BriefGenerator.generate()`
- `DeckGenerator.generate()`
- `VisualMatch.match()`
- `Renderer.render()`
- `Reviewer.review()`

## 阶段流转

workflow 固定按以下顺序推进：

1. `PARSED`
2. `BRIEFED`
3. `DECK_GENERATED`
4. `VISUAL_MATCHED`
5. `RENDERED`
6. `REVIEWED`

之后进入三种结果之一：

- `APPROVED`
- `REWRITE_PENDING`
- `FAILED`

### 每个阶段做什么

#### 1. PARSED

activity：

- `executeParsedStage(jobId, versionNumber)`

调用：

- `SourceParser.parse()`

输入：

- `sourceInput`

产物：

- `parsedSource`

#### 2. BRIEFED

activity：

- `executeBriefStage(jobId, versionNumber)`

调用：

- `BriefGenerator.generate()`

输入：

- `sourceInput`
- `parsedSource`

产物：

- `contentBrief`

#### 3. DECK_GENERATED

activity：

- `executeDeckStage(jobId, versionNumber)`

调用：

- `DeckGenerator.generate()`

输入：

- `parsedSource`
- `contentBrief`

产物：

- `deckPlan`

#### 4. VISUAL_MATCHED

activity：

- `executeVisualStage(jobId, versionNumber)`

调用：

- `VisualMatch.match()`

输入：

- `parsedSource`
- `contentBrief`
- `deckPlan`
- `sourceInput.preferredStyle`

产物：

- `deckPlan`（带模板绑定的更新版）
- `visualSpec`

#### 5. RENDERED

activity：

- `executeRenderStage(jobId, versionNumber)`

调用：

- `Renderer.render()`

输入：

- `deckPlan`
- `visualSpec`

产物：

- `renderResult`
- 本地渲染资源：SVG / PNG / HTML

#### 6. REVIEWED

activity：

- `executeReviewStage(jobId, versionNumber)`

调用：

- `Reviewer.review()`

输入：

- `parsedSource`
- `contentBrief`
- `deckPlan`
- `visualSpec`
- `renderResult`

产物：

- `reviewResult`

## Review 结束后的分支

review 完成后，workflow 会调用：

- `finalizeReview(jobId, versionNumber)`

分支规则：

- `decision === approve` -> `APPROVED`
- `decision === block` -> `FAILED`
- `decision === rewrite` -> 进入 `REWRITE_PENDING`

另外还有一个保护规则：

- 如果 rewrite 次数超过上限，直接 `FAILED`
- 如果最近多次改写提升过低，也会直接 `FAILED`

## Rewrite 机制

### 触发方式

客户端调用：

- `POST /api/jobs/:jobId/rewrite`

服务端通过 Temporal signal 发送：

- `requestRewrite`

### workflow 中的处理

workflow 在 `REWRITE_PENDING` 状态下等待 signal：

- `pendingRewrite = true`
- `runtimeStatus = waiting_signal`

收到 signal 后会调用：

- `createRewriteVersion(jobId, targetStage, reason)`

### Rewrite 版本如何创建

会创建新的 `jobVersion`，并增加：

- `activeVersion`
- `rewriteCount`

然后复制可以复用的历史产物。

复制规则：

- 目标是 `source-parse`：只复制 `sourceInput`
- 目标是 `brief`：复制 `sourceInput`、`parsedSource`
- 目标是 `deck`：复制 `sourceInput`、`parsedSource`、`contentBrief`
- 目标是 `visual`：复制 `sourceInput`、`parsedSource`、`contentBrief`、`deckPlan`

这样下游阶段可以直接继续跑，不需要从头生成。

## 数据落点

### 数据库里保留的内容

当前数据库主要存两类数据：

1. 业务产物

- `source_inputs`
- `parsed_sources`
- `content_briefs`
- `deck_plans`
- `visual_specs`
- `render_results`
- `review_results`

2. 审计与版本信息

- `jobs`
- `job_versions`
- `stage_logs`
- `rewrite_logs`

### 数据库里不再承担的职责

数据库不再维护独立流程状态机。

也就是说：

- `jobs` 记录任务元信息
- `jobs.activeVersion` 指向当前版本
- workflow 当前阶段、运行态、是否等待 signal，由 Temporal runtime state 负责

接口里返回给前端的 `status`，是服务层基于以下信息派生出来的：

- Temporal query 返回的 runtime state
- 当前 version 的 review 结果
- 当前 version 的 stage logs
- 当前 version 的已落盘产物

## 为什么保留 activities，而不是 workflow 直接调用 generation 模块

因为 Temporal 中：

- workflow 应该保持可 replay
- 有副作用的逻辑应该放在 activity

当前这些行为都属于副作用：

- 调模型
- 写数据库
- 写文件
- 渲染图片
- 记录 stage logs

所以不能把它们直接塞进 workflow。

## Worker 重启时的行为

Temporal worker 重启后，workflow 代码会 replay，这是正常行为。

这里要区分两件事：

- workflow replay：为了恢复状态机
- activity re-execution：真正的副作用执行

当前实现里，activity 内部对已存在产物有跳过逻辑，因此不会因为 worker 重启就把每个阶段都重新生成一遍。

例如：

- 已有 `parsedSource` 且不需要从 `source-parse` 重跑，会跳过 parse
- 已有 `deckPlan` 且不是相关 rewrite，会跳过 deck
- 已有 `renderResult` 会跳过 render

## 当前文件关系

最重要的几处关系如下：

- `jobs.controller.ts`
  -> `JobApplicationService`
- `JobApplicationService`
  -> `TemporalWorkflowRuntime`
- `TemporalWorkflowRuntime`
  -> `jobWorkflow`
  -> `TemporalJobActivitiesImpl`
- `TemporalJobActivitiesImpl`
  -> `SourceParser / BriefGenerator / DeckGenerator / VisualMatch / Renderer / Reviewer`

整体链路：

`HTTP Request -> Application Service -> Temporal Runtime -> Workflow -> Activities -> Generation Modules -> Repositories / Storage`

## 目前的架构结论

当前实现已经按下面的边界收敛：

- Temporal 是唯一流程编排者
- activities 是唯一阶段副作用执行层
- generation 模块是纯业务阶段实现
- 数据库存业务产物，不再存独立流程状态机

如果后续继续演进，最自然的优化方向是：

- 继续把 `job.activities.ts` 拆成更小的 activity helper 文件
- 让 review / rewrite / artifact copy 等逻辑进一步模块化
- 保持 workflow 本身尽量薄，只负责编排和状态推进
