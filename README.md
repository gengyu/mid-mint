# mid-mint

`mid-mint` 是一个面向小红书图文内容的生成平台，核心目标是把“原始信息输入”变成“可预览、可导出、可复写”的多页图文 deck。

当前仓库的主能力已经收敛为一条 stage-based workflow：

1. 接收用户输入的链接、长文本和补充要求
2. 解析为结构化内容
3. 生成内容 brief 和 deck 结构
4. 匹配视觉路线与模板
5. 渲染 SVG / PNG / HTML 预览
6. 做 review，并支持从指定阶段 rewrite 重跑

## 平台怎么用

平台前端分成 4 个页面视图：

- `Create`
  填写输入内容，创建一个 job
- `Workspace`
  查看各阶段产物、review 结果、stage meta，并发起 rewrite
- `Preview`
  查看当前版本的渲染结果
- `Export`
  导出当前版本的 `PNG`、`SVG` 或 `HTML`

典型使用流程：

1. 在 `Create` 页面输入资料
   - `URLs`：一行一个链接，可留空
   - `Raw Text`：粘贴原始资料、会议纪要、采访稿、新闻摘要等
   - `Notes`：补充限制条件、场景、语气要求
   - `Target Audience`：目标受众
   - `Content Goal`：内容目标
   - `Preferred Style`：偏好的表达风格
2. 点击 `Create Job`
3. 进入 `Workspace` 后点击 `Run Workflow`
4. 等待系统依次跑完 `PARSED -> BRIEFED -> DECK_GENERATED -> VISUAL_MATCHED -> RENDERED -> REVIEWED`
5. 在 `Preview` 查看页面效果
6. 如果 review 不满意，在 `Workspace` 里选择 `Rewrite Stage` 并填写原因，然后点击 `Rewrite And Rerun`
7. 在 `Export` 下载产物

## 本地启动

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env.local`，按需填写：

```bash
cp .env.example .env.local
```

可用变量：

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `LOCAL_IMAGE_BASE_URL`
- `LOCAL_IMAGE_API_KEY`
- `LOCAL_IMAGE_MODEL`
- `TEMPORAL_ENABLED`
- `TEMPORAL_ADDRESS`
- `TEMPORAL_NAMESPACE`
- `TEMPORAL_TASK_QUEUE`

说明：

- 不填 `OPENAI_API_KEY` 时，文案链路会尽量走 fallback 逻辑，但效果会弱一些
- 背景图会优先尝试 `LOCAL_IMAGE_BASE_URL` 指向的本地 OpenAI 兼容图片接口
- 如果本地图片模型不可用，系统会退回程序化背景
- `TEMPORAL_ENABLED=true` 时会启用 Temporal worker 与 durable workflow；未开启或初始化失败时会自动回退到当前内置编排器

### 3. 启动开发环境

```bash
pnpm dev
```

默认地址：

- 前端：`http://localhost:5173`
- API：`http://localhost:3101`

## API 能力

主工作流接口：

- `POST /api/jobs`：创建 job
- `POST /api/jobs/:jobId/run`：运行当前 job
- `GET /api/jobs/:jobId`：获取 job 状态
- `GET /api/jobs/:jobId/versions/:version`：获取指定版本的阶段产物
- `POST /api/jobs/:jobId/rewrite`：从指定阶段创建新版本并重跑
- `GET /api/jobs/:jobId/preview`：获取预览信息
- `POST /api/jobs/:jobId/export`：生成导出链接

仓库里还保留了两条补充能力：

- `POST /api/generate`
  单张素材快速生成接口
- `POST /api/generate-xhs`
  旧版小红书 deck 快速生成接口

这两条接口仍可用，但当前主入口已经是 `jobs/workflow` 这套 stage-based 工作流。

## 目录说明

核心目录：

- `src/client`
  前端工作台
- `src/jobs`
  Jobs API controller 与模块装配
- `src/modules`
  source / brief / deck / visual / render / review / workflow 主流程模块
- `src/lib/templates`
  SVG 模板与 schema
- `storage/v1`
  workflow 的本地数据与产物
- `docs/prd`
  当前产品与实现设计文档

常见产物位置：

- job 元数据：`storage/v1/*.json`
- 渲染输出：`storage/v1/jobs/<jobId>/v<version>/`
- 导出页：`storage/v1/jobs/<jobId>/v<version>/exports/`
- 程序化背景图：`public/generated-backgrounds/`

## 可选脚本

如果需要批量生成营销素材，可以运行：

```bash
pnpm generate:xhs
```

生成结果会写入 `marketing/xiaohongshu/assets/`。

## 开发备注

- 生产构建命令：`pnpm build`
- 启动服务端入口：`pnpm start`
- 代码主要围绕“小红书多页 deck 生成 + review + rewrite”展开

设计基线见 [docs/prd/000-overview.md](/Users/gengyu/code/mid-mint/docs/prd/000-overview.md)。
