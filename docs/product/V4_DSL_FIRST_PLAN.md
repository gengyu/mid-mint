# V4_DSL_FIRST_PLAN.md

## 版本定位

PPT 第四版是 `DSL-first` 版本。

目标不是继续增强模板，也不是继续堆多个分散 plan，而是设计并落地一套稳定的 PPT 描述语言。

第四版核心产物：

```txt
ppt-dsl.json
```

它类似前端领域的：

- Design Tokens
- Component Tree
- Auto Layout
- CSS Grid / Flex
- Scene Graph

Renderer 的职责变成：

```txt
解释 PPT DSL -> 计算布局 -> 渲染为 pptx
```

## 核心目标

1. 接收 `Markdown / Txt / HTML`
2. 解析文档结构
3. 通过模型理解内容、受众、叙事和页数
4. 生成完整 `ppt-dsl.json`
5. 多轮 refinement 修改同一份 DSL
6. 根据 DSL 生成 SVG / Mermaid / Formula 等稳定资产
7. renderer 优先消费 DSL
8. 导出 `.pptx`
9. 全部输入、中间产物、输出落盘

## 不再继续的方向

- 不使用固定模板库
- 不把用户传入页数作为生成目标
- 不让 renderer 猜页面结构
- 不让多个 plan 分散承担最终渲染语义
- 不走真实图片链路
- 不为了未来扩展引入复杂插件系统

## 第四版主流程

目标流程：

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

## DSL 分层

`ppt-dsl.json` 应该分为五层：

```txt
ppt-dsl
├── deck        叙事与演讲目标
├── design      全局风格体系
├── slides      页面结构和元素树
├── assets      生成或渲染后的素材引用
└── constraints 全局渲染约束
```

### deck

负责整套演示的叙事，不负责具体视觉。

包含：

- title
- audience
- narrativeArc
- talkTrack
- density
- slide count

### design

负责整套 PPT 的风格体系，类似前端 design system。

建议结构：

```txt
design
├── theme       主题身份：名字、气质、适用场景
├── tokens      原子变量：颜色、字体、间距、圆角、线条
├── components  组件样式：卡片、标签、引用、表格、代码块
├── patterns    页面模式：封面、章节页、对比页、流程页的风格倾向
└── rules       设计规则：密度、留白、对齐、视觉层级
```

### slides

负责每页的结构和内容。

页面不是模板实例，而是：

```txt
Slide
  -> Layout
  -> Slots
  -> Elements
  -> Constraints
```

元素类型包括：

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

### assets

负责可复用或已生成的素材引用。

第四版只做稳定资产：

- SVG
- Mermaid rendered SVG
- Formula rendered SVG

不做真实图片。

### constraints

负责限制不可控输出。

常用约束：

- `keep-within-safe-area`
- `avoid-overlap`
- `preserve-reading-order`
- `prefer-single-primary-idea`
- `fit-text`
- `preserve-aspect-ratio`
- `allow-downscale`
- `allow-wrap`
- `no-real-image`

## 文件产物

第四版项目目录：

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
│   ├── round-03/
│   │   ├── objective.json
│   │   └── ppt-dsl.json
│   └── round-04/
│       ├── objective.json
│       └── ppt-dsl.json
├── assets/
│   ├── slide-002.svg
│   └── ...
└── output/
    ├── round-01-structure.pptx
    ├── round-02-design-system.pptx
    ├── round-03-assets.pptx
    ├── round-04-polish.pptx
    └── presentation.pptx
```

## 多轮生成

第四版多轮 refinement 修改同一个 DSL。

### Round 1: Structure DSL

目标：

- 决定页数
- 决定叙事顺序
- 决定每页 intent
- 生成基础元素树
- 不追求视觉完整

锁定：

- `deck.narrativeArc`
- `slides[*].role`
- `slides[*].intent`
- `slides[*].sourceRefs`

### Round 2: Design System DSL

目标：

- 补全 `design.theme`
- 补全 `design.tokens`
- 补全 `design.components`
- 调整基础 layout 和视觉层级

锁定：

- 全局主题方向
- 基础设计 tokens
- 页面阅读顺序

### Round 3: Asset DSL

目标：

- 为高价值页面补 SVG / Mermaid / Formula 资产需求
- 只处理值得补强的页面
- 不把所有页面都变成重视觉页

锁定：

- `assets`
- `svg` 元素的生成目标
- 技术表达元素

### Round 4: Polish DSL

目标：

- 修正密度
- 减少重复页面节奏
- 优化收尾
- 做全局一致性检查

锁定：

- 最终可渲染 DSL

## 模块边界

- `projects`
  只负责创建项目、查看项目、触发生成
- `pipeline`
  只负责串联第四版主流程
- `parser`
  只负责输入文档结构化
- `llm`
  只负责模型调用和结构化 JSON 输出
- `ppt-dsl`
  负责 DSL 类型、DSL Builder、DSL refinement、DSL validation
- `assets`
  负责根据 DSL 生成 SVG / Mermaid / Formula 资产
- `renderer`
  只负责解释 DSL 并渲染 PPTX
- `storage`
  只负责项目目录与产物读写

## 开发顺序

1. 固定 DSL 类型和文档契约
2. 新增 `ppt-dsl` 模块
3. 实现 `PptDslBuilder`
4. pipeline 写出 `ppt-dsl.json`
5. 每轮 refinement 写出 `iterations/round-xx/ppt-dsl.json`
6. renderer 增加 `renderFromDsl`
7. assets 从 DSL elements 生成素材
8. 删除旧 plan / slide-specs 主链路代码
9. 删除 renderer 中的旧模板残留
10. 用长文档跑 4 个版本对比

## 下一阶段任务

下一阶段任务统一维护在：

```txt
docs/product/TASKS.md
```

当前优先级：

1. Content Segmentation
2. Theme Policy
3. DSL Validator
4. Renderer Layout Upgrade
5. Evaluation System
6. Long Document Regression

## 验收标准

- `ppt-dsl.json` 可以独立描述整套 PPT
- 不依赖固定模板文件
- 不依赖用户传入页数
- 未配置 LLM 时拒绝生成
- 每轮 refinement 都有对应 DSL
- renderer 可以优先从 DSL 生成 PPT
- 长文档不会被压成固定少数页
- 风格体系可以通过 `design` 单独扩展
- 新元素类型可以通过 `elements.kind` 扩展
