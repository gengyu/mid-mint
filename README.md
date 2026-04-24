# Mid-mint

一个本地优先的 AI PPT 生成服务。

当前项目按 PPT 第三版推进，目标不是“把文案切成几页”，而是把一份 `Markdown / Txt / HTML` 文档变成一套真正可用于演讲的 `.pptx`。

## 当前目标

- 解析输入文档并产出稳定的结构化中间产物
- 用 LLM 生成内容分析、Deck 规划和多轮 refinement
- 生成统一的 `ppt-dsl.json`，用描述语言表达整套 PPT
- 生成全局设计计划和页型布局计划作为过渡期调试视图
- 先判断页面角色 / 布局类型，再决定页内表达技术
- 生成视觉素材并输出 `.pptx`
- 将全部中间产物写入项目目录，便于检查和迭代

## 核心生成模型

第三版后续主方向是 `PPT 描述语言`，类似前端里的 design tokens、组件树、Auto Layout、CSS Grid / Flex。

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

现有 `deck-plan / design-plan / layout-plan / visual-plan / slide-specs` 会先保留，作为过渡期的调试视图和兼容输入。

页面生成采用两层结构：

1. 页面角色 / 布局类型
2. 页面内部表达技术

当前统一使用 8 类页面角色 / 布局类型：

1. `cover`
2. `agenda`
3. `section-divider`
4. `text-visual`
5. `comparison`
6. `process`
7. `quote`
8. `summary / closing`

页面内部可逐步接入这些表达技术：

- `bullets`
- `mermaid`
- `svg`
- `table`
- `code-block`
- `formula`
- `svg-hero`

当前代码主路径已经稳定落地的表达技术主要是：

- `none`
- `svg`

当前第三版不走真实图片链路，封面和主视觉统一使用 SVG 生成。

`mermaid / table / code-block / formula` 目前仍属于第三版后续接入能力。

## 当前主流程

```txt
Document
  -> Parse
  -> Analyze
  -> Deck Plan
  -> Design Plan
  -> Layout Plan
  -> Visual Plan
  -> Slide Specs
  -> PPT DSL
  -> Refine
  -> Assets
  -> Render
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

执行当前第三版主流程，生成解析结果、分析结果、大纲、视觉规划、逐页内容、多轮 refinement 结果和最终输出文件。

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
- `deck-plan.json`
- `design-plan.json`
- `layout-plan.json`
- `visual-plan.json`
- `slide-specs.json`
- `ppt-dsl.json`
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
├── deck-plan.json
├── design-plan.json
├── layout-plan.json
├── visual-plan.json
├── slide-specs.json
├── ppt-dsl.json
├── iterations/
│   └── round-xx/
├── assets/
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
2. [IMPLEMENTATION_PLAN.md](/Users/gengyu/github/mid-mint/docs/IMPLEMENTATION_PLAN.md)
3. [PPT_DSL.md](/Users/gengyu/github/mid-mint/docs/PPT_DSL.md)
4. [FILE_CONTRACTS.md](/Users/gengyu/github/mid-mint/docs/FILE_CONTRACTS.md)
5. [sample.md](/Users/gengyu/github/mid-mint/examples/sample.md)
