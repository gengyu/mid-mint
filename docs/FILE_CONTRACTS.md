# FILE_CONTRACTS.md

## 说明

本文件定义第一版中间产物的最小结构。

这些结构不是长期标准，只是为了：

1. 让 AI 工具知道每一步该产出什么
2. 降低模块之间的沟通成本
3. 方便人工检查结果

## parsed-document.json

```json
{
  "title": "RAG Engineering",
  "sourceType": "markdown",
  "rawText": "# RAG Engineering",
  "sections": [
    {
      "level": 1,
      "title": "Problem",
      "body": "Why RAG matters",
      "bullets": ["Context quality", "Latency", "Cost"]
    }
  ],
  "paragraphs": ["Why RAG matters"]
}
```

## content-analysis.json

```json
{
  "mainTopic": "RAG Engineering",
  "summary": "How to build a practical RAG system.",
  "keyMessages": [
    "Context quality matters",
    "Retrieval must be stable",
    "Evaluation is required"
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
      "keyPoint": "Overview of the topic",
      "sourceSectionTitle": "RAG Engineering",
      "layoutHint": "cover"
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
    "subtitle": "A practical system view",
    "layout": "cover",
    "bullets": [],
    "notes": "Opening slide"
  },
  {
    "slideNumber": 2,
    "title": "Problem",
    "layout": "text-visual",
    "bullets": ["Context quality", "Latency", "Cost"],
    "paragraph": "Why RAG matters",
    "assetPath": "data/projects/<projectId>/assets/slide-002.svg"
  }
]
```

## assets/

### SVG 资源命名

```txt
slide-002.svg
slide-003.svg
slide-004.svg
```

### 约束

- 一页最多一个主图示
- 第一版只需要简单 SVG
- 如果引入 Mermaid，最终仍然落成 SVG 文件

## output/

最终输出：

```txt
output/presentation.pptx
```

要求：

- 文件可被 PowerPoint / Keynote / WPS 正常打开
- 第一版只要求内容完整，不要求视觉非常精细
