# V3_REQUIREMENTS_ARCHIVE.md

## 归档说明

本文归档 PPT 第三版阶段的需求、判断和实现边界。

第三版的主要价值是跑通了本地优先的“文档 -> PPT”主链路，并证明了几个关键判断：

- PPT 不应该一遍流程直接生成最终成品
- 长文档不应该被固定压缩成 6 页
- 页数应该由模型根据内容判断，而不是由用户参数控制
- 不应该依赖真实图片链路，当前主视觉优先使用 SVG
- 固定模板会限制后续设计能力，应删除模板渲染思路
- 中间产物必须落盘，方便排查和迭代

从第四版开始，项目主线切换为 `DSL-first`。

第三版内容不再作为新开发目标，只作为历史背景和兼容说明。

## 第三版目标

第三版目标是建立一条稳定的“文档 -> 可讲 PPT”主链路，而不是只生成能打开的 PPT 文件。

范围：

- 接收 `Markdown / Txt / HTML`
- 解析文档结构
- 分析内容并生成演示规划
- 生成 `deck-plan.json`
- 生成 `design-plan.json`
- 生成 `layout-plan.json`
- 生成 `visual-plan.json`
- 生成 `slide-specs.json`
- 支持多轮 refinement
- 生成 SVG 视觉素材
- 渲染并导出 `.pptx`
- 将输入、中间产物和输出文件保存到项目目录

## 第三版主流程

```txt
Document
  -> Parse
  -> Analyze
  -> Deck Plan
  -> Design Plan
  -> Layout Plan
  -> Visual Plan
  -> Slide Specs
  -> Refine
  -> Assets
  -> Render
```

## 第三版页面规则

第三版采用两层结构：

1. 页面角色 / 布局类型
2. 页面内部表达技术

当时约定的 8 类页面角色 / 布局类型：

1. `cover`
2. `agenda`
3. `section-divider`
4. `text-visual`
5. `comparison`
6. `process`
7. `quote`
8. `summary / closing`

页面内部表达技术：

- `bullets`
- `mermaid`
- `svg`
- `table`
- `code-block`
- `formula`
- `svg-hero`

## 第三版保留价值

这些判断继续保留：

- Controller 不写业务逻辑
- `pipeline` 只串联主流程
- `parser` 只做文档结构化
- `llm` 统一负责模型调用和结构化输出
- `storage` 只负责项目目录与产物读写
- 未配置 LLM 时拒绝生成
- 用户不传 `requestedSlides`
- 页数由内容和模型判断
- 不走真实图片，优先 SVG
- 不引入数据库、队列、权限、在线编辑等重能力

## 第三版需要停止继续扩展的方向

以下方向从第四版开始停止继续加码：

- 围绕固定模板继续扩展 renderer
- 让 `slide-specs.json` 成为最终核心协议
- 让 `design-plan / layout-plan / visual-plan` 分散承担最终渲染职责
- 为每种页面类型写独立模板函数
- 让 renderer 自己猜叙事、设计和布局

## 迁移到第四版的原因

第三版的问题不是“功能不够多”，而是中间表达层还不够统一。

旧结构里：

- `deck-plan` 管叙事
- `design-plan` 管主题
- `layout-plan` 管 slot
- `visual-plan` 管素材
- `slide-specs` 管内容
- renderer 还要继续做大量解释和猜测

这会导致长期问题：

- plan 之间语义重复
- 多轮 refinement 修改对象不稳定
- renderer 不知道自己应该听谁的
- 风格体系不容易复用
- 新增 chart / table / code / formula / mermaid 时容易散落到多个模块

第四版改为：

```txt
Document
  -> Parse
  -> Analyze
  -> PPT DSL
  -> Refine PPT DSL
  -> Assets
  -> Render
```

`ppt-dsl.json` 成为下一版的唯一主协议。
