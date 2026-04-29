# TASKS.md

## 说明

本文件是第四版之后的任务清单。

规则：

- 每个任务必须有目标、范围、验收标准
- 每个任务完成并验证后，才能进入下一个任务
- 任务文档优先于聊天记录
- 如需求变化，先改本文档，再改代码

## 当前任务队列

### T1: Content Segmentation

状态：`todo`

目标：

- 在生成 `ppt-dsl.json` 前，先把输入文档拆成可演讲单元
- 页数由内容单元决定，而不是由模型自由发挥或固定页数
- 长文档能稳定生成更长的 deck

范围：

- 新增 `content-segmentation.json`
- 每个 segment 包含 `title / intent / sourceRefs / contentWeight / suggestedRole / evidence`
- LLM 生成 DSL 时必须读取 segmentation

验收：

- `pnpm build` 通过
- `pnpm smoke examples/sample.md` 通过
- 长文档不会固定输出 6 页
- `content-segmentation.json` 落盘
- `ppt-dsl.slides[*].sourceRefs` 能对应到 segment

### T2: Theme Policy

状态：`todo`

目标：

- 让主题选择可控、可解释、可复用
- 支持同一内容生成不同主题版本

范围：

- 新增 `theme-policy.json`
- 支持自动主题选择
- 支持 API 可选传入主题偏好
- 保留当前主题预设：
  `data-dashboard / executive-ink / warm-paper / startup-bold / academic-clean`

验收：

- `ppt-dsl.design.theme` 必填
- smoke 输出包含主题名和主题说明
- 同一输入可以生成至少 2 种明显不同风格
- renderer 能消费不同主题 tokens

### T3: DSL Validator

状态：`todo`

目标：

- 检查 `ppt-dsl.json` 是否可渲染、可讲、可维护

范围：

- 新增 `PptDslValidatorService`
- 输出 `validation-report.json`
- 检查页数、必填字段、slots、elements、assets、密度和重复结构

验收：

- 缺 title/content 的 slide 会被标记
- element.slot 不存在会被标记
- assetId 找不到 asset 会被标记
- 连续页面同构过多会被标记
- validation report 落盘

### T4: Renderer Layout Upgrade

状态：`todo`

目标：

- 让 renderer 更充分解释 DSL，而不是只做基础布局

范围：

- 增强 `grid`
- 增强 `timeline`
- 增强 `comparison`
- 增强 `quote`
- 增强 `code / table / formula`
- 不同 theme 下渲染有明显差异

验收：

- 同一 DSL 的不同 role 有不同页面结构
- comparison 不再像普通 bullet 页
- timeline 有真实流程结构
- code/table/formula 有专用视觉样式

### T5: Evaluation System

状态：`todo`

目标：

- 恢复轻量评估体系，但不做复杂 reviewer 平台

范围：

- 新增 `evaluation-report.json`
- 评分项：
  `narrative / density / themeConsistency / layoutDiversity / assetUsefulness`

验收：

- 每次生成后输出评分
- 评分低于阈值时在 report 中写出原因
- 不自动改代码，不做复杂 auto-fix

### T6: Long Document Regression

状态：`todo`

目标：

- 用真实长文档检查第四版主链路

范围：

- 使用 RAG 长文档重新生成 PPT
- 对比四轮版本
- 检查页数、主题、DSL、assets、渲染结果

验收：

- 长文档生成合理页数，目标通常 12-20 页
- 四轮 `ppt-dsl.json` 都存在
- 四个 PPT 版本都能打开
- 最终报告记录问题和下一步修正项

## 完成定义

一个任务只有同时满足以下条件才算完成：

- 代码实现完成
- 相关文档更新
- `pnpm build` 通过
- 相关 smoke 或真实样例通过
- 产物目录符合 `docs/reference/FILE_CONTRACTS.md`
