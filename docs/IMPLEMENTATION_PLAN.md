# IMPLEMENTATION_PLAN.md

## 实施原则

本计划描述当前 PPT 第三版主链路的实现顺序。

目标是让开发者和 AI 工具围绕“页面角色 / 布局类型 + 页面内部表达技术 + 多阶段生成 + 多轮 refinement”这条主线推进，减少返工和无效抽象。

## 第三版生成原则

第三版不建议把 PPT 当成“一遍流程直接生成最终版”。

更稳定的主链路应该是：

1. 先生成结构成立的文字版和模板规划
2. 再按成本和稳定性逐层增强视觉
3. 高成本素材后置，避免前面结构变动导致返工
4. 每一轮都有明确目标，不按素材类型机械切轮

推荐把生成理解成两层：

1. 主阶段
   `Parse -> Analyze -> Deck Plan -> Visual Plan -> Slide Specs -> Refine`
2. 增强阶段
   `Low-cost Assets -> High-cost Assets -> Special Enhancements -> Render`

其中：

- `icon / simple svg / emphasis blocks` 属于低成本增强
- 封面和主视觉统一由 `svg` 生成，不单独走真实图片链路
- `table / code-block / formula / mermaid / 特殊技术页补强` 属于专项增强

这比固定定义成“第二遍只补 icon、第三遍只补图片”更稳，因为是否需要主视觉增强，应该先由 `visual-plan` 决定，而不是由轮次硬编码。

## 第三版实现顺序

### Step 1: 启动与模块装配

- `src/main.ts`
- `src/app.module.ts`

要求：

- 应用能启动
- 只装配当前阶段需要的模块
- 模块边界清晰

### Step 2: Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/generate`

要求：

- Controller 只做输入输出
- 项目创建、查询、生成触发放在 `ProjectsService`

### Step 3: Storage

- 创建 `data/projects/<projectId>/`
- 保存输入文件
- 保存 JSON 中间产物
- 保存素材文件
- 保存输出文件

要求：

- 默认只用文件系统
- 不引入数据库
- 目录结构稳定

### Step 4: Parser

- 支持 `markdown`
- 支持 `txt`
- 支持 `html`

要求：

- 产出稳定的 `ParsedDocument`
- 优先使用成熟解析库
- 不在 parser 中引入业务规划逻辑

### Step 5: Analyze

- 分析内容主题
- 识别关键信息
- 输出结构化分析结果

要求：

- `llm` 模块统一负责
- 不在多个模块重复调用模型
- 没配模型时允许 fallback

### Step 6: Deck Plan

- 生成 Deck 大纲
- 产出页级目标和结构

要求：

- 输出 `deck-plan.json`
- 与 `Analyze` 解耦
- 不把视觉细节塞进 deck plan

### Step 7: Visual Plan

- 先决定页面角色 / 布局类型
- 再决定页面内部表达技术
- 输出 `visual-plan.json`

要求：

- 固定 8 类页面角色 / 布局类型
- 不把 Mermaid / SVG / 公式当作新的页面类型
- 视觉规划与逐页文案拆开

### Step 8: Slides

- 生成每页内容定义
- 输出 `slide-specs.json`

要求：

- 每页结构稳定
- 保留 `eyebrow / highlight / notes`
- 不在 slides 层承担渲染细节

### Step 9: Refine

- 支持多轮 refinement
- 每轮落 `iterations/round-xx/slide-specs.json`

要求：

- 第一轮先锁结构，不追求素材齐全
- 第二轮补基础视觉和演讲感
- 第三轮只补高价值关键主视觉
- 第四轮处理特殊页和收尾

推荐轮次定义：

- `round-01`
  目标是让结构成立。确认页数、每页目标、页面角色 / 布局类型、文字骨架、讲述顺序。
- `round-02`
  目标是低成本视觉增强。补 `icon / simple svg / emphasis / visual hierarchy`，把“纯文字页”升级为“可讲页”。
- `round-03`
  目标是关键主视觉增强。只给真正需要的页补更强的 SVG 主视觉资源。
- `round-04`
  目标是专项补强和收尾。处理 `table / code-block / formula / mermaid / complex comparison` 等特殊页面，统一收尾风格。

### Step 10: Visual Assets

- 生成 SVG 或其他稳定素材

要求：

- 优先 SVG
- 可逐步接入 `mermaid / table / code-block / formula`
- 一页最多一个主视觉文件
- 先补低成本稳定素材，再补高成本素材
- 不是所有页都必须补图片，素材生成要服从 `visual-plan`

### Step 11: Render

- 根据 slide specs 生成 `.pptx`

要求：

- 优先保证文件能打开
- 支持 8 类页面角色 / 布局类型
- 渲染层只负责 PPT 生成

## 第三版推荐轮次设计

推荐把第三版的一次生成拆成 4 轮，但它们不是 4 条独立流程，而是同一项目下逐轮增强的链路。

### Round 1: 结构版

目标：

- 先得到能讲的结构版 PPT
- 输出页型选择、讲述顺序和文字骨架
- 明确哪些页将来需要素材，但此时可以先占位

这一轮重点产物：

- `content-analysis.json`
- `deck-plan.json`
- 第一版 `visual-plan.json`
- `slide-specs.json`
- `iterations/round-01/objective.json`
- `iterations/round-01/slide-specs.json`

要求：

- 页面角色 / 布局类型已经基本稳定
- 不要求所有素材到位
- renderer 可以先按无图或占位图渲染一个可打开版本

### Round 2: 基础视觉增强版

目标：

- 在不改变主结构的前提下提升演讲感
- 优先补低成本且稳定的视觉元素

重点内容：

- icon
- simple svg
- 强调块
- 层级强化
- 留白和密度调整

要求：

- 优先处理 `visualPriority = high` 且 `requiresAsset = true` 的页面
- 尽量不要推翻第一页已经确定的页型和结构

### Round 3: 高成本素材增强版

目标：

- 给关键页补更强的 SVG 主视觉资源
- 控制成本，避免所有页都进入重素材模式

重点内容：

- SVG hero visual
- 封面 hero graphic
- 关键说明页主图

要求：

- 只处理真正值得补图的页
- 主视觉必须服从页面目标，不能只为“看起来丰富”

### Round 4: 专项补强和收尾版

目标：

- 处理前几轮没有覆盖好的特殊页面
- 统一整套 deck 的收尾感和风格一致性

重点内容：

- `table`
- `code-block`
- `formula`
- `mermaid`
- 特殊 comparison / process / summary 页优化

要求：

- 这一轮以补短板为主
- 不轻易改动整套 deck 的基础结构

## 第三版近期迭代计划

### Iteration A: 巩固视觉规划

- 让 `visual-plan.json` 成为真正的设计决策层
- 增加 `visualTechnique / textTechnique / density / composition / visualPriority`
- 增加“建议在哪一轮补强”的决策字段
- 增加 `assetVariant`，区分 `foundation / hero / specialized`
- 明确“哪些页必须图示、哪些页优先文字”

验收：

- `visual-plan.json` 能独立解释每页为什么这么排
- `visual-plan.json` 能解释某页为什么在第 2 轮补 icon，而不是第 3 轮补图片
- renderer 不再自己猜大部分版式

### Iteration B: 接入高频技术内容

- 优先接 `mermaid`
- 补 `table`
- 补 `code-block`

验收：

- 文档中的 Mermaid、表格、代码块能进入页内表达技术分流
- 不再把这些内容一律降级成普通 bullet

### Iteration C: 强化演讲感

- 给 `quote` 和 `summary / closing` 更多稳定版式
- 强化 `section-divider`
- 控制布局重复

验收：

- 长文档输出不再是连续几页同模板
- 收尾页具备明显结束感

### Iteration D: 技术型页面增强

- 接入 `formula`
- 继续增强 SVG scene 能力
- 视情况补数据卡片、时间线、架构块图

验收：

- 技术文档里的公式和结构图能更自然进入 PPT
- 技术型 deck 不只剩 bullet 和普通说明文

## 优先阅读和编辑文件

1. `src/modules/projects/projects.controller.ts`
2. `src/modules/projects/projects.service.ts`
3. `src/modules/pipeline/pipeline.service.ts`
4. `src/modules/storage/project-storage.service.ts`
5. `src/modules/parser/parser.service.ts`
6. `src/modules/llm/llm-json.service.ts`
7. `src/modules/pipeline/pipeline.types.ts`
8. `src/modules/visuals/svg-generator.service.ts`
9. `src/modules/slides/slide-spec.service.ts`
10. `src/modules/renderer/pptx-renderer.service.ts`

## 现阶段不要提前做

- 单元测试、E2E、eslint、prettier 整治
- BullMQ / Redis / 异步队列
- Reviewer / Auto-fix
- Export 独立模块
- Repository 层
- TypeORM / PostgreSQL
- 复杂权限、认证、审计
- PDF / Notion / Confluence 导入
- 在线预览编辑
- 复杂 HTML 截图链路
- 为未来扩展预埋大量抽象
- 在没有 visual-plan 的情况下直接让 renderer 自己做设计决策
