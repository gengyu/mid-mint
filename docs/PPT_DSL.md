# PPT_DSL.md

## 核心判断

PPT 第三版不应该继续沿着“模板 + 参数填充”的方向走。

更稳定的方向是设计一套 `PPT 描述语言`，类似前端领域的：

- Design Tokens
- Component Tree
- Auto Layout
- CSS Grid / Flex
- DOM / Canvas Scene Graph

也就是说，模型不直接生成 PPT 坐标，也不选择固定模板，而是生成一份结构化、可解释、可渲染、可评估的 `ppt-dsl.json`。

Renderer 的职责从“根据模板拼 PPT”变成：

```txt
解释 PPT DSL -> 计算布局 -> 渲染为 pptx
```

## 为什么需要 PPT DSL

当前 `deck-plan / design-plan / layout-plan / visual-plan / slide-specs` 已经解决了很多中间问题，但它们还是分散的 JSON。

问题是：

- plan 之间会重复描述同一件事
- renderer 仍然需要猜测页面结构
- 长文档容易被压缩成少数模板页
- 多轮 refinement 缺少稳定的“编辑对象”
- 页面设计能力无法像前端设计语言一样持续积累

`ppt-dsl.json` 要成为第三版后续主产物。

其它文件在过渡期可以保留，但定位要调整为：

- `deck-plan.json`
  叙事规划视图
- `design-plan.json`
  全局设计语言视图
- `layout-plan.json`
  版式约束视图
- `visual-plan.json`
  素材和表达技术视图
- `slide-specs.json`
  当前 renderer 兼容视图
- `ppt-dsl.json`
  统一页面描述语言和最终渲染源

## 设计原则

### 1. 不固定模板

DSL 只能定义语言能力，不能定义固定模板。

允许：

- 页面角色
- 叙事意图
- 设计 tokens
- slot / frame / composition
- 元素树
- 约束
- 表达技术

不允许：

- 固定 6 页
- 固定模板文件
- 固定页面坐标库
- 让某种页面角色绑定唯一版式

### 2. 页面是元素树，不是模板实例

一页 PPT 应该描述为：

```txt
Slide
  -> Layout
  -> Slots
  -> Elements
  -> Constraints
```

元素可以是：

- text
- rich-text
- list
- statement
- quote
- table
- code
- formula
- mermaid
- svg
- shape
- connector
- card
- group

Renderer 根据元素树和约束渲染，而不是根据页面类型调用模板函数。

### 3. 坐标由 renderer 计算

LLM 不应该直接输出大量绝对坐标。

LLM 应输出：

- composition
- frame direction
- slots
- semantic elements
- weight
- fit
- constraints

Renderer 再把这些描述转换成 PPT 坐标。

这样能减少模型随机坐标导致的不可控问题。

### 4. 设计语言独立于内容

设计语言类似前端 design tokens：

- color
- typography
- spacing
- radius
- stroke
- density
- rhythm

页面元素引用 token，不直接到处写硬编码颜色和字体。

### 5. 多轮 refinement 修改 DSL

四轮生成不应该分别改不同文件，而应该逐轮修改同一个 `ppt-dsl.json`。

推荐语义：

- `round-01`
  生成可讲结构，锁定 narrative / slide count / slide roles
- `round-02`
  补基础视觉层级，增强 list / card / shape / svg placeholder
- `round-03`
  补关键 SVG 主视觉，只强化高价值页面
- `round-04`
  补 table / code / formula / mermaid 等专项表达，并做全局一致性收尾

每轮输出：

```txt
iterations/round-xx/ppt-dsl.json
iterations/round-xx/objective.json
```

## 推荐主流程

目标流程：

```txt
Document
  -> Parse
  -> Analyze
  -> Deck Plan
  -> PPT DSL
  -> Refine PPT DSL
  -> Assets
  -> Render
```

过渡期流程：

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
  -> Render
```

过渡期允许继续生成旧产物，但新开发应优先围绕 `ppt-dsl.json`。

## ppt-dsl.json 示例

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

## 与现有产物的关系

### deck-plan -> ppt-dsl.deck / slides.intent

`deck-plan` 负责决定叙事结构和页数。

进入 DSL 后，重点映射为：

- `deck.title`
- `deck.narrativeArc`
- `slides[*].intent`
- `slides[*].role`
- `slides[*].sourceRefs`

### design-plan -> ppt-dsl.design

`design-plan` 映射为 DSL 的设计语言。

后续 renderer 只读取 token，不直接读取散落的颜色和字体字段。

### layout-plan -> ppt-dsl.slides[*].layout

`layout-plan` 映射为每页的：

- composition
- frame
- slots
- constraints

### visual-plan -> ppt-dsl.elements

`visual-plan` 不再单独决定页面结构，而是决定是否给某页补：

- svg element
- mermaid element
- table element
- code element
- formula element
- card / shape / connector

### slide-specs -> ppt-dsl.elements

`slide-specs` 的 title / bullets / paragraph / highlight 应转成元素树。

例如：

- `title` -> `text`
- `bullets` -> `list`
- `highlight` -> `statement`
- `tableData` -> `table`
- `codeBlock` -> `code`
- `formulaText` -> `formula`
- `mermaidDefinition` -> `mermaid`

## 下一步代码计划

### Step 1: 新增 DSL 类型和文件契约

- 新增 `src/modules/ppt-dsl/ppt-dsl.types.ts`
- 新增 `ppt-dsl.json` 文件契约
- 更新 README / AGENTS / IMPLEMENTATION_PLAN / FILE_CONTRACTS

### Step 2: 增加 DSL Builder

新增 `ppt-dsl` 模块，把现有中间产物合成为 `ppt-dsl.json`。

输入：

- parsed-document
- content-analysis
- deck-plan
- design-plan
- layout-plan
- visual-plan
- slide-specs

输出：

- `ppt-dsl.json`

### Step 3: Renderer 优先解释 DSL

renderer 从：

```txt
slide-specs -> pptx
```

迁移为：

```txt
ppt-dsl -> layout engine -> pptx
```

### Step 4: Refinement 改为修改 DSL

每轮 refinement 读上一轮 `ppt-dsl.json`，输出下一轮 `ppt-dsl.json`。

### Step 5: 旧产物降级为调试视图

当 DSL 链路稳定后，旧产物可以继续保留用于调试，但不再作为 renderer 的主要输入。
