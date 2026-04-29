# FILE_CONTRACTS.md

## 说明

本文件定义第四版 `DSL-first` 产物契约。

第四版只有一个主协议：

```txt
ppt-dsl.json
```

旧 `deck-plan / design-plan / layout-plan / visual-plan / slide-specs` 已从主链路删除。第三版历史说明见：

```txt
docs/archive/V3_REQUIREMENTS_ARCHIVE.md
```

## 项目目录

所有生成结果写入：

```txt
data/projects/<projectId>/
```

目标结构：

```txt
data/projects/<projectId>/
├── input.md | input.txt | input.html
├── project.json
├── parsed-document.json
├── content-analysis.json
├── ppt-dsl.json
├── iterations/
│   ├── round-01/
│   │   ├── objective.json
│   │   └── ppt-dsl.json
│   ├── round-02/
│   │   ├── objective.json
│   │   └── ppt-dsl.json
│   └── round-xx/
├── assets/
│   ├── slide-001.svg
│   ├── slide-003-mermaid.svg
│   └── ...
└── output/
    ├── round-01-structure-dsl.pptx
    ├── round-02-design-system-dsl.pptx
    ├── round-03-asset-dsl.pptx
    ├── round-04-polish-dsl.pptx
    └── presentation.pptx
```

## project.json

```json
{
  "id": "rag-demo-20260429-ab12cd",
  "title": "RAG Demo",
  "sourceType": "markdown",
  "createdAt": "2026-04-29T13:00:00.000Z",
  "updatedAt": "2026-04-29T13:10:00.000Z",
  "status": "generated",
  "outputFile": "/abs/path/data/projects/rag-demo-20260429-ab12cd/output/presentation.pptx"
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
      "bullets": ["Better grounding improves answer quality"]
    }
  ],
  "paragraphs": ["RAG is not just a prompt trick."]
}
```

## content-analysis.json

```json
{
  "mainTopic": "RAG Engineering",
  "summary": "RAG is a system problem involving ingestion, retrieval, ranking, and generation.",
  "audience": "Technical and business stakeholders",
  "tone": "Confident and practical",
  "keyMessages": ["Retrieval quality affects trust"],
  "storyArc": ["Context", "System", "Action"]
}
```

## ppt-dsl.json

`ppt-dsl.json` 是 renderer 的主输入，必须能独立描述整套 PPT。

顶层结构：

```json
{
  "system": "ppt-dsl-v1",
  "canvas": {
    "width": 13.333,
    "height": 7.5,
    "unit": "in",
    "safeArea": {
      "top": 0.48,
      "right": 0.62,
      "bottom": 0.48,
      "left": 0.62
    }
  },
  "deck": {
    "title": "RAG Engineering",
    "audience": "Technical and business stakeholders",
    "narrativeArc": ["Context", "System", "Action"],
    "talkTrack": "Explain RAG as knowledge infrastructure.",
    "density": "medium"
  },
  "design": {
    "intent": "Technical editorial system with calm hierarchy.",
    "tokens": {
      "color": {
        "background": "#F6F8FC",
        "surface": "#FFFFFF",
        "textPrimary": "#102033",
        "textSecondary": "#5B6B7F",
        "accent": "#0F766E"
      },
      "typography": {
        "title": {
          "font": "Aptos Display",
          "size": 30,
          "weight": "semibold",
          "colorToken": "textPrimary"
        },
        "body": {
          "font": "Aptos",
          "size": 14,
          "colorToken": "textSecondary"
        }
      },
      "spacing": {
        "pageMarginX": 0.62,
        "pageMarginY": 0.48,
        "sectionGap": 0.32,
        "itemGap": 0.16
      },
      "radius": {
        "card": 0.16
      },
      "stroke": {
        "default": 1
      }
    },
    "rhythm": {
      "opening": "Open with one strong promise.",
      "middle": "Alternate explanation, contrast, and structure.",
      "closing": "End with one decisive takeaway."
    }
  },
  "slides": [
    {
      "id": "slide-001",
      "index": 1,
      "role": "cover",
      "intent": "Establish the topic and promise.",
      "sourceRefs": ["RAG Engineering"],
      "layout": {
        "composition": "hero-right",
        "frame": {
          "direction": "hero",
          "padding": {
            "top": 0.48,
            "right": 0.62,
            "bottom": 0.48,
            "left": 0.62
          },
          "gap": 0.32,
          "align": "center"
        },
        "slots": {
          "title": {
            "region": "center-left",
            "weight": "primary",
            "fit": "text-flow",
            "constraints": ["fit-text", "allow-wrap"]
          },
          "heroVisual": {
            "region": "right-main",
            "weight": "primary",
            "fit": "contain",
            "constraints": ["no-real-image", "preserve-aspect-ratio"]
          }
        }
      },
      "elements": [
        {
          "id": "slide-001-title",
          "kind": "text",
          "slot": "title",
          "layer": 20,
          "textRole": "title",
          "text": "RAG Engineering",
          "constraints": ["fit-text", "allow-wrap"]
        },
        {
          "id": "slide-001-visual",
          "kind": "svg",
          "slot": "heroVisual",
          "layer": 90,
          "generationPrompt": "Abstract SVG system visual for RAG.",
          "constraints": ["no-real-image", "preserve-aspect-ratio"]
        }
      ],
      "speakerNotes": "Open with the system framing."
    }
  ],
  "assets": [],
  "constraints": ["keep-within-safe-area", "avoid-overlap", "no-real-image"]
}
```

## iterations

每一轮 refinement 写入：

```txt
iterations/round-xx/objective.json
iterations/round-xx/ppt-dsl.json
```

`objective.json` 示例：

```json
{
  "round": 1,
  "stage": "structure-dsl",
  "objective": "Lock the storyline, slide roles, and speaking structure.",
  "changes": []
}
```

## assets

资产只由 DSL elements 触发：

- `kind = svg`
- `kind = mermaid`
- `kind = formula`

生成后写入：

```txt
assets/<fileName>.svg
```

并回填：

- `ppt-dsl.assets`
- `slides[*].elements[*].assetId`

第四版不生成真实图片。
