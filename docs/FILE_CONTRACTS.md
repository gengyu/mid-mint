# FILE_CONTRACTS.md

## 说明

本文件定义当前第三版中间产物和输出文件的基础结构。

目标：

1. 让每一步输入输出清晰
2. 让模块之间职责边界稳定
3. 让 AI 和人工都能快速排查问题

第三版默认采用“多阶段生成 + 多轮增强”的方式。

方向调整：

- 后续主产物是 `ppt-dsl.json`
- `ppt-dsl.json` 是类似前端设计语言的统一 PPT 描述语言
- `deck-plan / design-plan / layout-plan / visual-plan / slide-specs` 过渡期保留为调试视图和兼容产物

也就是说：

- 不是一遍流程直接生成最终 PPT
- 第一轮先输出结构版
- 后续轮次再逐步补基础视觉、高成本素材和特殊技术页
- 每轮都需要有可检查、可落盘的中间产物

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
├── design-plan.json
├── layout-plan.json
├── visual-plan.json
├── slide-specs.json
├── ppt-dsl.json
├── iterations/
│   ├── round-01/
│   │   ├── objective.json
│   │   ├── ppt-dsl.json
│   │   ├── visual-plan.json
│   │   └── slide-specs.json
│   ├── round-02/
│   │   ├── objective.json
│   │   ├── ppt-dsl.json
│   │   ├── visual-plan.json
│   │   └── slide-specs.json
│   └── round-xx/
├── assets/
│   ├── slide-002.svg
│   ├── slide-002.icon.svg
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
      "objective": "Open with a clear promise and establish the talk narrative.",
      "sourceCoverage": ["RAG Engineering"],
      "structureReason": "Use the title section as the opening promise.",
      "contentWeight": "low"
    }
  ]
}
```

## design-plan.json

`design-plan.json` 定义整套 PPT 的全局设计系统，作用类似前端设计系统里的 design tokens。

它回答的是：

```txt
这套 PPT 看起来是什么气质？
颜色、字体、间距、密度、圆角、节奏如何统一？
```

示例：

```json
{
  "themeName": "technical-editorial",
  "designIntent": "Create a calm, structured presentation that turns source material into a clear talkable narrative.",
  "audience": "Technical and business stakeholders",
  "tone": "Confident and practical",
  "density": "medium",
  "visualStyle": "technical",
  "colorTokens": {
    "background": "#F6F8FC",
    "surface": "#FFFFFF",
    "surfaceAlt": "#E8EEF5",
    "textPrimary": "#102033",
    "textSecondary": "#5B6B7F",
    "accent": "#0F766E",
    "accentSoft": "#D9F2F5",
    "border": "#D9E3F0",
    "inverseBackground": "#0B1F33",
    "inverseText": "#FFFFFF",
    "warning": "#F59E0B"
  },
  "typographyTokens": {
    "displayFont": "Aptos Display",
    "bodyFont": "Aptos",
    "monoFont": "Aptos Mono",
    "titleSize": 31,
    "subtitleSize": 18,
    "bodySize": 15,
    "captionSize": 9
  },
  "spacingTokens": {
    "pageMarginX": 0.62,
    "pageMarginY": 0.48,
    "sectionGap": 0.32,
    "itemGap": 0.16
  },
  "shapeTokens": {
    "cardRadius": 0.1,
    "panelRadius": 0.16,
    "lineWidth": 1.1
  },
  "slideRhythm": {
    "opening": "Strong cover promise with one hero visual moment.",
    "middle": "Alternate text-visual, process, comparison, and quote layouts to avoid repetition.",
    "closing": "End with a concise final takeaway and clear action frame."
  }
}
```

## layout-plan.json

`layout-plan.json` 定义逐页结构草图，采用 slot-based layout DSL。

它不是固定模板库，而是“受约束的生成式页面结构语言”。

它回答的是：

```txt
每一页有哪些槽位？
内容应该进入哪个槽位？
页面方向、间距、对齐和密度约束是什么？
```

示例：

```json
{
  "system": "generative-slot-layout-v1",
  "canvas": {
    "width": 13.333,
    "height": 7.5,
    "unit": "in"
  },
  "slides": [
    {
      "slideNumber": 3,
      "layout": "text-visual",
      "role": "content",
      "composition": "asymmetric-split",
      "intent": "Combine a clear explanation with a supporting visual idea.",
      "frame": {
        "direction": "horizontal",
        "padding": { "x": 0.62, "y": 0.48 },
        "gap": 0.32,
        "align": "start"
      },
      "slots": {
        "title": {
          "region": "top-left",
          "weight": "primary"
        },
        "content": {
          "region": "left-main",
          "weight": "secondary",
          "fit": "text-flow"
        },
        "visual": {
          "region": "right-main",
          "weight": "primary",
          "fit": "contain"
        },
        "takeaway": {
          "region": "bottom-left",
          "weight": "accent"
        }
      },
      "constraints": [
        "Keep one primary idea.",
        "Let the visual clarify rather than decorate."
      ],
      "densityRules": {
        "maxBullets": 5,
        "maxParagraphChars": 240,
        "visualWeight": "medium"
      }
    }
  ]
}
```

约束说明：

- `layout-plan` 可以自由设计每页 `composition / slots / frame / constraints`
- `layout-plan` 不能改变 `deck-plan` 已确定的 `slideNumber / slide count / role / layout`
- `padding / gap / densityRules` 会被限制在合理范围内，避免生成不可渲染结构

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
      "assetPriority": "medium",
      "recommendedEnhancementRound": 2,
      "assetVariant": "foundation",
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
  页内视觉表达技术，例如 `mermaid / svg / table / formula`
- `textTechnique`
  页内文字表达方式，例如 `short-bullets / statement / two-column-summary`
- `visualPriority`
  `low / medium / high`
- `composition`
  图文结构，例如 `full-bleed / left-panel / right-panel / two-column`
- `density`
  页面文字密度，例如 `low / medium / high`
- `requiresAsset`
  是否必须生成 SVG 或其他当前主链路支持的稳定素材
- `assetPriority`
  素材投入优先级，例如 `low / medium / high`
- `recommendedEnhancementRound`
  建议在哪一轮增强，例如 `1 / 2 / 3 / 4`
- `assetVariant`
  资产形态，例如 `foundation / hero / specialized`

当前实现说明：

- 当前主链路稳定输出的 `visualTechnique` 主要是 `none / svg`
- `mermaid / table / code-block / formula` 目前是规划字段，还没有在主链路中自动产出
- `txt / html` 当前共用同一套纯文本结构化解析逻辑
- 全局主题、颜色、字体、间距和节奏由 `design-plan.json` 承担
- 页型 slot、方向、间距、对齐和密度约束由 `layout-plan.json` 承担
- `recommendedEnhancementRound` 用来表达“先结构、再基础 SVG 主视觉、再关键页主视觉强化、最后专项补强”的顺序，不代表必须每轮都修改该页
- `assetVariant` 用来表达当前这页更适合基础图示、hero 主视觉，还是专项技术图示

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
    "assetPath": "/abs/path/data/projects/<projectId>/assets/slide-002.svg",
    "layoutMeta": {
      "composition": "asymmetric-split",
      "frame": {
        "direction": "horizontal",
        "padding": { "x": 0.62, "y": 0.48 },
        "gap": 0.32,
        "align": "start"
      },
      "slots": {
        "title": {
          "region": "top-left",
          "weight": "primary"
        },
        "content": {
          "region": "left-main",
          "weight": "secondary",
          "fit": "text-flow"
        },
        "visual": {
          "region": "right-main",
          "weight": "primary",
          "fit": "contain"
        }
      },
      "constraints": [
        "Keep one primary idea."
      ],
      "densityRules": {
        "maxBullets": 5,
        "maxParagraphChars": 240,
        "visualWeight": "medium"
      }
    }
  }
]
```

当前实现说明：

- 顶层 `slide-specs.json` 和每轮 `iterations/round-xx/slide-specs.json` 会附带 `layoutMeta`
- `layoutMeta` 来自 `layout-plan.json`
- renderer 会优先用 `layoutMeta.slots` 解析封面、通用内容页和 `text-visual` 页的主要区域

## ppt-dsl.json

`ppt-dsl.json` 是第三版后续主产物，定义一套统一的 PPT 描述语言。

它回答的是：

```txt
这份 PPT 的叙事、设计语言、页面结构、元素树和渲染约束是什么？
```

它不是模板实例，也不是 PPT 坐标清单。

它更接近前端里的：

- design tokens
- component tree
- auto layout
- CSS grid / flex
- scene graph

示例：

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
    "title": "RAG 工程化",
    "audience": "技术和业务决策者",
    "narrativeArc": ["问题", "误区", "系统化方案", "落地路径"],
    "talkTrack": "解释为什么真实公司的 RAG 是知识基础设施，而不是向量库问答。",
    "density": "medium"
  },
  "design": {
    "intent": "技术编辑风，强调结构、可信度和系统感。",
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
          "size": 32,
          "weight": "semibold",
          "colorToken": "textPrimary"
        },
        "body": {
          "font": "Aptos",
          "size": 15,
          "colorToken": "textSecondary"
        }
      },
      "spacing": {
        "sm": 0.12,
        "md": 0.24,
        "lg": 0.48
      },
      "radius": {
        "card": 0.16
      },
      "stroke": {
        "hairline": 1
      }
    },
    "rhythm": {
      "opening": "用一个强观点开场。",
      "middle": "结构页、解释页、对比页交替出现。",
      "closing": "用清晰行动建议收束。"
    }
  },
  "slides": [
    {
      "id": "slide-001",
      "index": 1,
      "role": "cover",
      "intent": "建立主题和演讲承诺。",
      "sourceRefs": ["title"],
      "layout": {
        "composition": "hero-right",
        "frame": {
          "direction": "horizontal",
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
            "region": "left-main",
            "weight": "primary",
            "fit": "text-flow",
            "constraints": ["fit-text", "preserve-reading-order"]
          },
          "visual": {
            "region": "right-main",
            "weight": "accent",
            "fit": "contain",
            "constraints": ["preserve-aspect-ratio", "no-real-image"]
          }
        }
      },
      "elements": [
        {
          "id": "el-title",
          "kind": "text",
          "slot": "title",
          "layer": 10,
          "textRole": "title",
          "text": "RAG 工程化",
          "style": {
            "typographyToken": "title"
          },
          "constraints": ["fit-text"]
        },
        {
          "id": "el-hero",
          "kind": "svg",
          "slot": "visual",
          "layer": 20,
          "generationPrompt": "Generate an abstract SVG system map for enterprise knowledge infrastructure.",
          "constraints": ["no-real-image", "preserve-aspect-ratio"]
        }
      ],
      "speakerNotes": "先说明 RAG 不是向量库问答，而是一套知识基础设施。"
    }
  ],
  "constraints": [
    "keep-within-safe-area",
    "avoid-overlap",
    "prefer-single-primary-idea",
    "no-real-image"
  ]
}
```

字段建议说明：

- `system`
  DSL 版本号，目前为 `ppt-dsl-v1`
- `canvas`
  PPT 画布尺寸和安全区域
- `deck`
  整套演示的叙事信息
- `design`
  全局设计语言和 design tokens
- `slides[*].layout`
  每页 composition、frame、slots 和布局约束
- `slides[*].elements`
  页面元素树，包括文本、列表、表格、代码、公式、Mermaid、SVG、形状、卡片和分组
- `constraints`
  全局渲染约束

映射关系：

- `deck-plan.json` -> `ppt-dsl.deck` 和 `ppt-dsl.slides[*].intent`
- `design-plan.json` -> `ppt-dsl.design`
- `layout-plan.json` -> `ppt-dsl.slides[*].layout`
- `visual-plan.json` -> `ppt-dsl.slides[*].elements` 中的视觉元素需求
- `slide-specs.json` -> `ppt-dsl.slides[*].elements` 中的内容元素

当前实现说明：

- `ppt-dsl.json` 是下一步代码迭代目标
- 过渡期 renderer 仍可消费 `slide-specs.json`
- DSL 链路稳定后，renderer 应优先消费 `ppt-dsl.json`

## iterations/

第三版 refinement 每轮应写入：

```txt
iterations/round-01/objective.json
iterations/round-01/ppt-dsl.json
iterations/round-01/visual-plan.json
iterations/round-01/slide-specs.json
iterations/round-02/objective.json
iterations/round-02/ppt-dsl.json
iterations/round-02/visual-plan.json
iterations/round-02/slide-specs.json
```

建议每一轮都落这三类文件：

- `objective.json`
  说明这一轮要解决什么问题，例如“锁定结构”或“补基础视觉”。
- `visual-plan.json`
  说明这一轮之后的视觉决策状态，尤其是哪些页要补素材、为何补、何时补。
- `slide-specs.json`
  说明这一轮之后真正用于渲染的逐页内容定义。

推荐轮次语义：

- `round-01`
  结构版。先确认页型、文字骨架、讲述顺序。
- `round-02`
  基础视觉增强版。补 icon、simple svg、强调块和层级。
- `round-03`
  关键主视觉增强版。补关键 SVG 主视觉资源。
- `round-04`
  专项补强版。处理 `table / code-block / formula / mermaid` 和特殊页收尾。

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
- `svg-hero`

当前实现中已稳定落地的是 `svg / none`，其他技术仍按后续迭代接入。

第三版建议把这些技术按投入成本分层使用：

- 低成本稳定增强：
  `icon / simple svg / emphasis`
- 统一主视觉增强：
  `svg`
- 专项技术增强：
  `mermaid / table / code-block / formula`

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
slide-002.icon.svg
slide-003.svg
slide-004.svg
```

当前约束：

- 一页最多一个主视觉文件
- 当前优先支持简单 SVG
- 后续如果接入其他素材来源，最终仍然需要稳定落盘
- 如果同一页有多种素材，应在命名上体现用途，而不是只保留页码

建议约定：

- `slide-002.svg`
  该页主视觉 SVG
- `slide-002.icon.svg`
  该页补充 icon 或小型符号素材
- 第三版当前不生成真实图片文件，主视觉统一写成 SVG

## output/

输出约定：

```txt
output/presentation.pptx
```

要求：

- 文件可被常见 PPT 软件打开
- 输出路径可回写到 `project.json`
- 第三版要求页面角色清晰、布局不单一、具备基本演讲感
