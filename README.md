# Mid-mint

一个本地优先的 AI PPT 生成服务。

当前项目进入 PPT 第四版开发阶段，目标不是继续增强模板，而是建立一套 `DSL-first` 的“文档 -> PPT 描述语言 -> 可讲 PPT”主链路。

## 当前目标

- 解析输入文档并产出稳定的结构化中间产物
- 用 LLM 生成内容分析、叙事结构和多轮 refinement
- 生成统一的 `ppt-dsl.json`，用描述语言表达整套 PPT
- 用 `design` 描述整套 PPT 的风格体系、主题样式和设计 tokens
- 用 `slides[*].layout / slots / elements / constraints` 描述页面结构
- 生成视觉素材并输出 `.pptx`
- 将全部中间产物写入项目目录，便于检查和迭代

## 核心生成模型

第四版主方向是 `PPT 描述语言`，类似前端里的 design tokens、组件树、Auto Layout、CSS Grid / Flex。

也就是说：

```txt
模型生成 ppt-dsl.json -> renderer 解释 DSL -> 输出 pptx
```

`ppt-dsl.json` 会统一描述：

- deck narrative
- design tokens
- slide roles
- layout frames
- slots
- elements
- constraints
- speaker notes

现有 `deck-plan / design-plan / layout-plan / visual-plan / slide-specs` 会迁移到 `debug/` 或作为兼容视图保留，不再作为长期主协议。

第四版不使用固定模板库，不走真实图片链路，主视觉和技术表达优先使用 SVG / Mermaid / Formula 等稳定可控资产。

## 当前主流程

```txt
Document
  -> Parse
  -> Analyze
  -> PPT DSL Draft
  -> Refine PPT DSL
  -> Asset Plan
  -> Generate Assets
  -> Render From DSL
```

## 当前接口

以下内容是当前仓库唯一维护的 API 说明入口。

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/generate`

### POST /projects

创建项目并保存输入文档。

请求示例：

```json
{
  "title": "RAG Demo",
  "content": "# RAG Engineering\n\nSome markdown...",
  "sourceType": "markdown"
}
```

字段：

- `title` 可选，项目标题
- `content` 必填，原始文档内容
- `sourceType` 可选，当前支持 `markdown`、`txt`、`html`

### GET /projects

返回当前项目列表。

### GET /projects/:projectId

返回单个项目记录。

### POST /projects/:projectId/generate

执行当前主流程，生成解析结果、分析结果、`ppt-dsl.json`、多轮 DSL refinement 结果、视觉素材和最终输出文件。

请求示例：

```json
{
  "refinementRounds": 4
}
```

字段：

- `refinementRounds` 可选，1 到 4 轮 refinement

页数由模型根据输入内容自动判断，不再使用用户传入的页数目标。

前置条件：

- 必须先配置 `LLM_BASE_URL`
- 必须先配置 `LLM_MODEL`
- 没有配置 LLM 时，接口不会再走 fallback 生成

生成结果会写入：

```txt
data/projects/<projectId>/
```

当前关键产物包括：

- `input.*`
- `project.json`
- `parsed-document.json`
- `content-analysis.json`
- `ppt-dsl.json`
- `iterations/round-xx/ppt-dsl.json`
- `debug/*`
- `iterations/round-xx/*`
- `assets/*`
- `output/presentation.pptx`

错误响应：

- `404` 项目不存在
- `400` 请求体格式错误
- `503` 未配置 LLM，拒绝生成
- `500` 服务端执行失败

## 项目结构

```txt
src/
├── main.ts
├── app.module.ts
├── common/
├── config/
└── modules/
    ├── projects/
    ├── pipeline/
    ├── parser/
    ├── llm/
    ├── visuals/
    ├── slides/
    ├── renderer/
    └── storage/
```

## 产物目录

运行时项目产物写到：

```txt
data/projects/<projectId>/
├── input.*
├── project.json
├── parsed-document.json
├── content-analysis.json
├── ppt-dsl.json
├── iterations/
│   └── round-xx/
│       ├── objective.json
│       └── ppt-dsl.json
├── assets/
├── debug/
└── output/
    └── presentation.pptx
```

`data/` 已被加入 `.gitignore`，默认不再提交运行产物。

## 快速开始

```bash
pnpm install
pnpm build
pnpm dev
pnpm smoke
```

## 示例输入

示例文案见 [sample.md](/Users/gengyu/github/mid-mint/examples/sample.md)。

## 推荐阅读顺序

1. [AGENTS.md](/Users/gengyu/github/mid-mint/AGENTS.md)
2. [V4_DSL_FIRST_PLAN.md](/Users/gengyu/github/mid-mint/docs/V4_DSL_FIRST_PLAN.md)
3. [PPT_DSL.md](/Users/gengyu/github/mid-mint/docs/PPT_DSL.md)
4. [FILE_CONTRACTS.md](/Users/gengyu/github/mid-mint/docs/FILE_CONTRACTS.md)
5. [V3_REQUIREMENTS_ARCHIVE.md](/Users/gengyu/github/mid-mint/docs/archive/V3_REQUIREMENTS_ARCHIVE.md)
6. [sample.md](/Users/gengyu/github/mid-mint/examples/sample.md)
