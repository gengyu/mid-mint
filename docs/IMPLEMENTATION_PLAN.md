# IMPLEMENTATION_PLAN.md

## 当前版本

当前进入 PPT 第四版开发阶段。

第四版主题：

```txt
DSL-first PPT generation
```

第三版需求已经归档到：

```txt
docs/archive/V3_REQUIREMENTS_ARCHIVE.md
```

后续开发以第四版计划为准：

```txt
docs/V4_DSL_FIRST_PLAN.md
docs/PPT_DSL.md
docs/FILE_CONTRACTS.md
```

## 实施原则

第四版不继续围绕固定模板增强 renderer。

核心目标是建立一套稳定、可解释、可渲染、可扩展的 PPT 描述语言：

```txt
ppt-dsl.json
```

Renderer 的职责是：

```txt
解释 PPT DSL -> 计算布局 -> 渲染为 pptx
```

模型的职责是：

```txt
理解文档 -> 规划叙事 -> 生成 DSL -> 多轮修正 DSL
```

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

过渡期兼容流程：

```txt
Document
  -> Parse
  -> Analyze
  -> Legacy Plans
  -> Build PPT DSL
  -> Render From DSL
```

`Legacy Plans` 只作为调试视图：

- `deck-plan.json`
- `design-plan.json`
- `layout-plan.json`
- `visual-plan.json`
- `slide-specs.json`

## 第四版实现顺序

### Step 1: 固定 DSL 契约

- 完善 `docs/PPT_DSL.md`
- 完善 `docs/FILE_CONTRACTS.md`
- 完善 `src/modules/ppt-dsl/ppt-dsl.types.ts`

要求：

- DSL 可以独立描述整套 PPT
- DSL 包含 deck / design / slides / assets / constraints
- DSL 支持主题样式和全局风格体系扩展
- DSL 不绑定固定模板

### Step 2: 新增 ppt-dsl 模块

- 新建 `PptDslModule`
- 新建 `PptDslBuilderService`
- 新建 `PptDslValidatorService`

要求：

- Builder 能把现有中间产物合成为 `ppt-dsl.json`
- Validator 能检查必要字段、页数、元素、slot、约束
- 不在 Builder 中做 PPT 渲染

### Step 3: pipeline 写出 DSL

- pipeline 生成并落盘 `ppt-dsl.json`
- 每轮 refinement 写出 `iterations/round-xx/ppt-dsl.json`
- 旧产物迁移到 `debug/`

要求：

- 未配置 LLM 时拒绝生成
- 不使用用户传入页数
- 页数由模型根据内容判断
- 每轮都能检查 DSL 差异

### Step 4: renderer 支持 DSL

- 增加 `renderFromDsl`
- renderer 解释 `design.tokens`
- renderer 解释 `slides[*].layout.slots`
- renderer 解释 `slides[*].elements`

要求：

- renderer 不做叙事规划
- renderer 不猜页面角色
- renderer 不调用 LLM
- renderer 不依赖固定模板文件

### Step 5: assets 从 DSL 生成

- 从 `elements.kind = svg` 生成 SVG
- 从 `elements.kind = mermaid` 渲染 SVG
- 从 `elements.kind = formula` 渲染 SVG

要求：

- 不走真实图片链路
- asset 写回 `ppt-dsl.assets`
- 一页不强制必须有主视觉

### Step 6: 四轮 DSL refinement

#### Round 1: Structure DSL

- 决定页数
- 决定叙事顺序
- 决定每页 intent
- 生成基础元素树

#### Round 2: Design System DSL

- 补全 `design.theme`
- 补全 `design.tokens`
- 补全 `design.components`
- 调整基础 layout 和视觉层级

#### Round 3: Asset DSL

- 为高价值页面补 SVG / Mermaid / Formula 资产需求
- 不把所有页面都变成重视觉页

#### Round 4: Polish DSL

- 修正密度
- 减少重复页面节奏
- 优化收尾
- 做全局一致性检查

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

## 优先阅读和编辑文件

1. `AGENTS.md`
2. `README.md`
3. `docs/V4_DSL_FIRST_PLAN.md`
4. `docs/PPT_DSL.md`
5. `docs/FILE_CONTRACTS.md`
6. `src/modules/ppt-dsl/ppt-dsl.types.ts`
7. `src/modules/pipeline/pipeline.service.ts`
8. `src/modules/renderer/pptx-renderer.service.ts`

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
- 真实图片生成链路
- 复杂插件系统
