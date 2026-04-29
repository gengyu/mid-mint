# PPT_DSL.md

## 定位

`ppt-dsl.json` 是第四版唯一主协议。

它不是模板实例，也不是 PPT 坐标清单，而是一份类似前端设计语言的结构化描述：

```txt
Design Tokens + Layout Slots + Element Tree + Constraints
```

Renderer 的职责：

```txt
解释 PPT DSL -> 计算布局 -> 渲染为 pptx
```

## 顶层结构

```txt
ppt-dsl
├── system
├── canvas
├── deck
├── design
├── slides
├── assets
└── constraints
```

## deck

描述整套演示的叙事信息：

- `title`
- `audience`
- `narrativeArc`
- `talkTrack`
- `density`

## design

描述整套 PPT 的风格体系：

```txt
design
├── intent
├── tokens.color
├── tokens.typography
├── tokens.spacing
├── tokens.radius
├── tokens.stroke
└── rhythm
```

页面元素应该引用 token，而不是到处写死样式。

## slides

每页由四部分组成：

```txt
Slide
  -> role
  -> intent
  -> layout
  -> elements
```

`layout` 负责：

- `composition`
- `frame`
- `slots`

`elements` 负责：

- 文本
- 列表
- 表格
- 代码
- 公式
- Mermaid
- SVG
- 形状和卡片

## element kinds

当前支持：

- `text`
- `rich-text`
- `list`
- `statement`
- `quote`
- `table`
- `code`
- `formula`
- `mermaid`
- `svg`
- `shape`
- `connector`
- `badge`
- `card`
- `group`

## constraints

当前支持：

- `keep-within-safe-area`
- `avoid-overlap`
- `preserve-reading-order`
- `prefer-single-primary-idea`
- `fit-text`
- `preserve-aspect-ratio`
- `allow-downscale`
- `allow-wrap`
- `no-real-image`

## 示例片段

```json
{
  "system": "ppt-dsl-v1",
  "deck": {
    "title": "RAG Engineering",
    "audience": "Technical stakeholders",
    "narrativeArc": ["Context", "System", "Action"],
    "talkTrack": "Explain RAG as knowledge infrastructure.",
    "density": "medium"
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
          "padding": { "top": 0.48, "right": 0.62, "bottom": 0.48, "left": 0.62 },
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
      ]
    }
  ]
}
```

## 扩展方式

- 新主题：扩展 `design.tokens`
- 新版式：扩展 `layout.composition` 和 `slots`
- 新表达：扩展 `elements.kind`
- 新约束：扩展 `constraints`

扩展 DSL 时优先保证 renderer 可解释，不要把模型输出变成不可控坐标。
