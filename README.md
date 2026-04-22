# Mid-mint

一个本地优先的 AI PPT 生成服务。

当前项目按 PPT 第二版推进，目标不是“把文案切成几页”，而是把一份 `Markdown / Txt / HTML` 文档变成一套真正可用于演讲的 `.pptx`。

## 当前目标

- 解析输入文档并产出稳定的结构化中间产物
- 用 LLM 生成内容分析、Deck 规划和多轮 refinement
- 先判断页面角色 / 布局类型，再决定页内表达技术
- 生成视觉素材并输出 `.pptx`
- 将全部中间产物写入项目目录，便于检查和迭代

## 核心生成模型

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
- `image`

当前代码主路径已经稳定落地的表达技术主要是：

- `none`
- `image`
- `svg`

`mermaid / table / code-block / formula` 目前仍属于第二版后续接入能力。

## 当前主流程

```txt
Document
  -> Parse
  -> Analyze
  -> Deck Plan
  -> Visual Plan
  -> Slide Specs
  -> Refine
  -> Assets
  -> Render
```

## 当前接口

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/generate`

接口细节见 [API.md](/Users/gengyu/github/mid-mint/docs/API.md)。

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
├── visual-plan.json
├── slide-specs.json
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
2. [PPT_V2_LAYOUTS.md](/Users/gengyu/github/mid-mint/docs/PPT_V2_LAYOUTS.md)
3. [IMPLEMENTATION_PLAN.md](/Users/gengyu/github/mid-mint/docs/IMPLEMENTATION_PLAN.md)
4. [FILE_CONTRACTS.md](/Users/gengyu/github/mid-mint/docs/FILE_CONTRACTS.md)
5. [API.md](/Users/gengyu/github/mid-mint/docs/API.md)
6. [sample.md](/Users/gengyu/github/mid-mint/examples/sample.md)
