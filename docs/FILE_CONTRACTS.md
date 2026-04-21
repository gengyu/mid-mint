# FILE_CONTRACTS.md

## 说明

本文件定义第一版中间产物和输出文件的基础结构。

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
├── input.md | input.txt | input.docx | input.html
├── project.json
├── parsed-document.json
├── content-analysis.json
├── deck-plan.json
├── visual-plan.json
├── slide-specs.json
├── assets/
│   ├── slide-002.svg
│   └── ...
└── output/
    └── <title>.pptx
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
  "outputFile": "/abs/path/data/projects/rag-demo-20260421-ab12cd/output/rag-engineering.pptx"
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
  "keyMessages": [
    "Better grounding improves answer quality",
    "Retrieval quality affects trust",
    "Context selection is a common failure point"
  ]
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
      "layoutHint": "cover"
    }
  ]
}
```

## visual-plan.json

```json
{
  "theme": "clean-light",
  "slides": [
    {
      "slideNumber": 2,
      "visualType": "diagram",
      "goal": "Explain the core pipeline",
      "assetFile": "slide-002.svg"
    }
  ]
}
```

## slide-specs.json

```json
[
  {
    "slideNumber": 1,
    "title": "RAG Engineering",
    "subtitle": "A system view of retrieval-augmented generation",
    "layout": "cover",
    "bullets": [],
    "notes": "Opening slide"
  },
  {
    "slideNumber": 2,
    "title": "Why It Matters",
    "layout": "text-visual",
    "bullets": [
      "Better grounding improves answer quality",
      "Retrieval quality directly affects trust"
    ],
    "paragraph": "RAG is not just a prompt trick.",
    "notes": "Explain why retrieval quality matters.",
    "assetPath": "/abs/path/data/projects/<projectId>/assets/slide-002.svg"
  }
]
```

## assets/

命名约定：

```txt
slide-002.svg
slide-003.svg
slide-004.svg
```

第一版约束：

- 一页最多一个主视觉文件
- 第一版优先支持简单 SVG
- 后续如果接入其他素材来源，最终仍然需要稳定落盘

## output/

输出约定：

```txt
output/<title>.pptx
```

要求：

- 文件可被常见 PPT 软件打开
- 输出路径可回写到 `project.json`
- 第一版优先保证内容完整和文件可用
