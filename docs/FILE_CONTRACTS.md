# FILE_CONTRACTS.md

## 说明

本文件定义当前第二版中间产物和输出文件的基础结构。

目标：

1. 让每一步输入输出清晰
2. 让模块之间职责边界稳定
3. 让 AI 和人工都能快速排查问题

## 项目目录

所有生成结果写入：

```txt
data/projects/<projectId>/
```

参考结构：

```txt
data/projects/<projectId>/
├── input.md | input.txt | input.html
├── project.json
├── parsed-document.json
├── content-analysis.json
├── deck-plan.json
├── visual-plan.json
├── slide-specs.json
├── iterations/
│   └── round-xx/
├── assets/
│   ├── slide-002.svg
│   └── ...
└── output/
    └── presentation.pptx
```

## project.json

```json
{
  "id": "rag-demo-20260421-ab12cd",
  "title": "RAG Demo",
  "sourceType": "markdown",
  "createdAt": "2026-04-21T13:00:00.000Z",
  "updatedAt": "2026-04-21T13:10:00.000Z",
  "status": "generated",
  "outputFile": "/abs/path/data/projects/rag-demo-20260421-ab12cd/output/presentation.pptx"
}
```

## parsed-document.json

```json
{
  "title": "RAG Engineering",
  "sourceType": "markdown",
  "rawText": "# RAG Engineering",
  "sections": [
    {
      "level": 1,
      "title": "Why It Matters",
      "body": "RAG is not just a prompt trick.",
      "bullets": [
        "Better grounding improves answer quality",
        "Retrieval quality directly affects trust"
      ]
    }
  ],
  "paragraphs": [
    "RAG is not just a prompt trick."
  ]
}
```

## content-analysis.json

```json
{
  "mainTopic": "RAG Engineering",
  "summary": "RAG is a system problem involving ingestion, retrieval, ranking, and generation.",
  "audience": "General business audience",
  "tone": "Confident and practical",
  "keyMessages": [
    "Better grounding improves answer quality",
    "Retrieval quality affects trust",
    "Context selection is a common failure point"
  ],
  "storyArc": ["Context", "Key ideas", "Action"]
}
```

## deck-plan.json

```json
{
  "title": "RAG Engineering",
  "totalSlides": 5,
  "slides": [
    {
      "slideNumber": 1,
      "title": "RAG Engineering",
      "keyPoint": "Presentation overview",
      "sourceSectionTitle": "RAG Engineering",
      "layoutHint": "cover",
      "role": "cover",
      "visualFocus": "visual",
      "objective": "Open with a clear promise and establish the talk narrative."
    }
  ]
}
```

## visual-plan.json

```json
{
  "theme": "editorial-soft",
  "slides": [
    {
      "slideNumber": 2,
      "role": "content",
      "layout": "process",
      "visualType": "diagram",
      "visualTechnique": "svg",
      "textTechnique": "short-bullets",
      "visualPriority": "high",
      "goal": "Explain the core pipeline",
      "composition": "right-panel",
      "density": "medium",
      "accentTone": "teal",
      "requiresAsset": true,
      "assetFile": "slide-002.svg"
    }
  ]
}
```

字段建议说明：

- `role`
  页面的演讲角色，例如 `cover / section / content / closing`
- `layout`
  固定 8 类页面角色 / 布局类型之一
- `visualTechnique`
  页内视觉表达技术，例如 `mermaid / svg / table / formula / image`
- `textTechnique`
  页内文字表达方式，例如 `short-bullets / statement / two-column-summary`
- `visualPriority`
  `low / medium / high`
- `composition`
  图文结构，例如 `full-bleed / left-panel / right-panel / two-column`
- `density`
  页面文字密度，例如 `low / medium / high`
- `requiresAsset`
  是否必须生成 SVG 或图片素材

当前实现说明：

- 当前主链路稳定输出的 `visualTechnique` 主要是 `none / image / svg`
- `mermaid / table / code-block / formula` 目前是规划字段，还没有在主链路中自动产出
- `txt / html` 当前共用同一套纯文本结构化解析逻辑

## slide-specs.json

```json
[
  {
    "slideNumber": 1,
    "title": "RAG Engineering",
    "subtitle": "A system view of retrieval-augmented generation",
    "eyebrow": "Presentation",
    "sectionLabel": "RAG ENGINEERING",
    "layout": "cover",
    "role": "cover",
    "bullets": [],
    "highlight": "RAG Engineering",
    "notes": "Opening slide"
  },
  {
    "slideNumber": 2,
    "title": "Why It Matters",
    "eyebrow": "Section insight",
    "sectionLabel": "SECTION 02 / 06",
    "layout": "text-visual",
    "role": "content",
    "bullets": [
      "Better grounding improves answer quality",
      "Retrieval quality directly affects trust"
    ],
    "paragraph": "RAG is not just a prompt trick.",
    "highlight": "Explain why this matters",
    "notes": "Explain why retrieval quality matters.",
    "visualGoal": "Translate the idea into a process-style visual",
    "visualType": "diagram",
    "visualComposition": "right-panel",
    "accentTone": "teal",
    "assetPath": "/abs/path/data/projects/<projectId>/assets/slide-002.svg"
  }
]
```

## iterations/

第二版 refinement 每轮应写入：

```txt
iterations/round-01/objective.json
iterations/round-01/slide-specs.json
iterations/round-02/objective.json
iterations/round-02/slide-specs.json
```

## 页面角色 / 布局类型

当前固定 8 类：

1. `cover`
2. `agenda`
3. `section-divider`
4. `text-visual`
5. `comparison`
6. `process`
7. `quote`
8. `summary / closing`

这些不是固定页数，而是固定页型集合。

## 页面内部表达技术

这些不是新的页面类型，而是页面内部内容表达方式：

- `bullets`
- `mermaid`
- `svg`
- `table`
- `code-block`
- `formula`
- `image`

当前实现中已稳定落地的是 `svg / image / none`，其他技术仍按后续迭代接入。

## 页面映射约束

建议遵守这些主路径规则：

1. 顶部 H1 只生成 `cover`
2. `agenda` 通常只出现 0 或 1 页
3. 章节切换时可插入 `section-divider`
4. 流程、路线、步骤优先映射到 `process`
5. 表格和左右对照优先映射到 `comparison`
6. 长代码和长公式不直接原样塞进普通正文页
7. 连续正文页不要无限复用同一 layout

## assets/

命名约定：

```txt
slide-002.svg
slide-003.svg
slide-004.svg
```

当前约束：

- 一页最多一个主视觉文件
- 当前优先支持简单 SVG
- 后续如果接入其他素材来源，最终仍然需要稳定落盘

## output/

输出约定：

```txt
output/presentation.pptx
```

要求：

- 文件可被常见 PPT 软件打开
- 输出路径可回写到 `project.json`
- 第二版要求页面角色清晰、布局不单一、具备基本演讲感
