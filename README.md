# mid-mint

面向小红书 deck 生成的工作流工作台。

当前仓库只保留两件核心事情：

1. `POST /api/workflows` 创建工作流，并自动启动整条 Temporal 流程
2. 前端默认进入工作流列表，点击实例查看步骤详情、运行状态和产物

## 页面

- `工作流列表`
  默认首页。左侧工作流列表，右侧当前实例详情。
- `新建工作流`
  只保留创建表单，没有额外运行按钮。

## 主要接口

- `POST /api/workflows`
- `GET /api/workflows`
- `GET /api/workflows/:workflowId`
- `GET /api/workflows/:workflowId/versions/:version`
- `POST /api/workflows/:workflowId/rewrite`

## 目录

- `src/client`
  前端工作流管理页
- `src/app/workflows`
  Nest 接口入口
- `src/application/workflows`
  应用服务、阶段执行工具、仓储契约
- `src/infra/runtime/temporal`
  Temporal runtime、workflow orchestration、activities
- `src/features/generation`
  各阶段业务实现
- `storage/v1`
  本地工作流数据与产物

## 开发

```bash
pnpm install
pnpm build
```

开发模式已经支持热重启，默认复用现有服务，不要重复起服务。
