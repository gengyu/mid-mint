# Temporal Workflow

## 概览

当前服务端已经收敛为一套以 Temporal 为唯一流程编排器的工作流。

核心原则：

- Temporal workflow 负责流程推进和运行态管理
- Temporal activities 负责每个阶段的副作用执行
- `src/features/generation/*` 负责各阶段的业务实现
- 数据库存储业务产物和审计日志，不再维护独立的流程状态机

当前主链路：

`create workflow -> workflowOrchestration -> parse -> brief -> deck -> visual -> render -> review -> approve / rewrite / fail`

## 代码入口

### API

- `POST /api/workflows`
- `GET /api/workflows`
- `GET /api/workflows/:workflowId`
- `GET /api/workflows/:workflowId/versions/:version`
- `POST /api/workflows/:workflowId/rewrite`

控制器：

- `src/app/workflows/workflows.controller.ts`

应用服务：

- `src/application/workflows/workflow-application.service.ts`

### Temporal Runtime

运行时初始化、worker 注册、query/signal 调用入口：

- `src/infra/runtime/temporal/temporal.runtime.ts`

### Workflow

唯一工作流编排器：

- `src/infra/runtime/temporal/workflows/workflow.orchestration.ts`

### Activities

阶段副作用执行层：

- `src/infra/runtime/temporal/activities/workflow.activities.ts`

### Generation Modules

- `src/features/generation/source`
- `src/features/generation/brief`
- `src/features/generation/deck`
- `src/features/generation/visual`
- `src/features/generation/render`
- `src/features/generation/review`

## 职责分层

### Workflow 层

职责：

- 定义阶段顺序
- 维护 `currentVersion`、`currentStage`、`runtimeStatus`
- 等待 rewrite signal
- 决定 `APPROVED / REWRITE_PENDING / FAILED`

### Activities 层

职责：

- 读取当前版本输入
- 调用 generation 模块
- 校验产物
- 持久化产物
- 记录 `stage_logs`
- 创建 rewrite 版本并复制可复用产物

可以理解为：

- workflow 决定“下一步做什么”
- activities 决定“这一步怎么执行并落盘”

### Generation 模块层

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

固定顺序：

1. `PARSED`
2. `BRIEFED`
3. `DECK_GENERATED`
4. `VISUAL_MATCHED`
5. `RENDERED`
6. `REVIEWED`

review 结束后进入：

- `APPROVED`
- `REWRITE_PENDING`
- `FAILED`

### 阶段对应关系

- `executeParsedStage(workflowId, versionNumber)` -> `SourceParser.parse()`
- `executeBriefStage(workflowId, versionNumber)` -> `BriefGenerator.generate()`
- `executeDeckStage(workflowId, versionNumber)` -> `DeckGenerator.generate()`
- `executeVisualStage(workflowId, versionNumber)` -> `VisualMatch.match()`
- `executeRenderStage(workflowId, versionNumber)` -> `Renderer.render()`
- `executeReviewStage(workflowId, versionNumber)` -> `Reviewer.review()`

## Rewrite 机制

客户端调用：

- `POST /api/workflows/:workflowId/rewrite`

workflow 在 `REWRITE_PENDING` 时等待 `requestRewrite` signal。

收到 signal 后会调用：

- `createRewriteVersion(workflowId, targetStage, reason)`

复制规则：

- `source-parse`：只复制 `sourceInput`
- `brief`：复制 `sourceInput`、`parsedSource`
- `deck`：复制 `sourceInput`、`parsedSource`、`contentBrief`
- `visual`：复制 `sourceInput`、`parsedSource`、`contentBrief`、`deckPlan`

## 数据落点

### 数据库存储

业务产物：

- `source_inputs`
- `parsed_sources`
- `content_briefs`
- `deck_plans`
- `visual_specs`
- `render_results`
- `review_results`

审计与版本：

- `workflow_versions`
- `stage_logs`
- `rewrite_logs`

### 不再由数据库维护的内容

- 当前运行阶段
- 运行态
- 是否等待 rewrite signal

这些都以 Temporal workflow state 为准。

## 重启行为

worker 重启后会发生 workflow replay，这是正常恢复机制。

这里要区分：

- workflow replay：恢复状态机
- activity re-execution：真正的副作用执行

当前实现里，activity 对已存在产物有跳过逻辑，所以不会因为 replay 就把每个阶段全量重算一遍。

## 文件关系

- `workflows.controller.ts` -> `WorkflowApplicationService`
- `WorkflowApplicationService` -> `TemporalWorkflowRuntime`
- `TemporalWorkflowRuntime` -> `workflowOrchestration` + `TemporalWorkflowActivitiesImpl`
- `TemporalWorkflowActivitiesImpl` -> generation modules + repositories

整体链路：

`HTTP Request -> Application Service -> Temporal Runtime -> Workflow -> Activities -> Generation Modules -> Repositories / Storage`
