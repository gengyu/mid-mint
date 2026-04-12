# mid-mint

面向小红书 deck 生成的任务工作台。

当前仓库只保留两件核心事情：

1. `POST /api/jobs` 创建任务，并自动启动整条工作流
2. 前端默认进入任务列表，点击任务查看步骤详情、执行状态和产物

## 页面

- `任务列表`
  默认首页。左侧任务列表，右侧任务详情。
- `新建任务`
  只保留创建任务表单，没有额外运行按钮。

## 主要接口

- `POST /api/jobs`
- `GET /api/jobs`
- `GET /api/jobs/:jobId`
- `GET /api/jobs/:jobId/versions/:version`

## 目录

- `src/client`
  前端任务管理页
- `src/jobs`
  任务接口入口
- `src/modules`
  workflow 与各阶段实现
- `storage/v1`
  本地任务数据与产物

## 开发

```bash
pnpm install
pnpm build
```

开发模式已经支持热重启，默认复用现有服务，不要重复起服务。
