# PPT_V2_LAYOUTS.md

## 第二版目标

第二版不再把 PPT 当成“把 Markdown 拆成几页文字”。

目标是：

1. 一份 `md / txt` 能生成一套真正可讲的 PPT
2. 每页先判断“这页是什么角色”，再决定“用什么布局”
3. 流程允许多轮迭代，而不是一次性输出
4. 页面生成采用“页面角色 / 布局类型 + 页面内部表达技术”两层结构

## 页型分析

### 1. Cover

适合放：

- 演讲标题
- 一个有张力的副标题
- 一个核心承诺或核心结论

不适合放：

- 长段落
- 过多 bullet

### 2. Agenda

适合放：

- 3 到 5 个章节标题
- 这次演讲的推进顺序

不适合放：

- 细节内容
- 图片堆砌

### 3. Section Divider

适合放：

- 新章节标题
- 一句过渡话

用途：

- 让演讲结构更清晰
- 给观众“翻篇”的感觉

### 4. Text Visual

适合放：

- 一个结论
- 一小段解释
- 一个配图或图示

推荐：

- 左文右图，或者左图右文
- 文字只保留讲述必须的信息

### 5. Comparison

适合放：

- 两组方案
- 两类能力
- 两个阶段或两类问题

推荐：

- 左右双栏
- 每栏 2 到 4 条

### 6. Process

适合放：

- 流程
- 路线图
- 方法论步骤

推荐：

- 3 到 5 步
- 每步一句短语
- 用箭头和序号体现顺序

### 7. Quote

适合放：

- 一个核心判断
- 一个值得观众记住的结论

推荐：

- 大字号
- 少量文字
- 强调一句话胜过堆很多 bullet

### 8. Summary / Closing

适合放：

- 3 条核心 takeaway
- 一个收束动作

推荐：

- 强记忆点
- 明确下一步

## 页面角色与页内技术的关系

第二版的关键不是“多几个模板”，而是两层结构：

1. 页面角色 / 布局类型
2. 页面内部表达技术

例如：

- `process + mermaid`
- `comparison + table`
- `quote + formula`
- `text-visual + svg`

这些技术不是新的页面类型，而是页面内部表达方式。

## 图片与文字分配原则

### 应该优先放图片的页面

- `cover`
- `text-visual`
- `comparison`
- `process`

### 应该优先放文字的页面

- `agenda`
- `section-divider`
- `summary`
- `closing`

### 何时必须生成图示

- 页面主题是流程、架构、步骤、路线图
- 文字超过 4 条且逻辑具有顺序关系
- 页面需要帮助观众快速建立空间感或结构感

## 页面内部表达技术

当前建议纳入规划的技术包括：

- `bullets`
- `mermaid`
- `svg`
- `table`
- `code-block`
- `formula`
- `image`

需要特别说明的是：

- 上面是第二版目标中的技术集合
- 当前代码主路径已经稳定落地的是 `svg / image / none`
- `mermaid / table / code-block / formula` 仍是下一阶段接入重点

### Mermaid

适合：

- 流程图
- 架构图
- 状态流转
- 技术路线

更适合配合的页面类型：

- `process`
- `text-visual`
- `section-divider`

### SVG

适合：

- 结构示意图
- 对比卡片
- 总结环图
- 数据流和关系图

更适合配合的页面类型：

- `text-visual`
- `comparison`
- `summary / closing`

### Table

适合：

- 参数对比
- 版本差异
- 方案优缺点

更适合配合的页面类型：

- `comparison`

### Code Block

适合：

- API 示例
- 配置片段
- SQL / Shell / Python / TypeScript 示例

更适合配合的页面类型：

- `text-visual`
- `quote`

### Formula

适合：

- 算法定义
- 优化目标
- 指标公式

更适合配合的页面类型：

- `quote`
- `text-visual`

## Visual Plan 规则

建议视觉规划层至少回答这几个问题：

1. 这页是什么页面角色 / 布局类型
2. 这页属于封面、过渡、正文还是收尾
3. 这页主要是文字优先、图优先，还是混合
4. 这页应该使用什么页面内部表达技术
5. 这页是否必须生成图示素材
6. 这页的文字密度预算是多少

一个典型的 `visual-plan` 条目可以是：

```json
{
  "slideNumber": 4,
  "role": "content",
  "layout": "process",
  "visualTechnique": "mermaid",
  "textTechnique": "short-bullets",
  "visualPriority": "high",
  "composition": "right-panel",
  "density": "medium"
}
```

如果按当前代码主路径，更接近真实输出的条目会是：

```json
{
  "slideNumber": 4,
  "role": "content",
  "layout": "process",
  "visualTechnique": "svg",
  "textTechnique": "short-bullets",
  "visualPriority": "high",
  "composition": "right-panel",
  "density": "medium"
}
```

## 文档块到页型的映射规则

### 顶部标题

默认映射：

- 第一个 `# 标题` -> `cover`

规则：

- 顶部标题只生成封面，不再重复生成一个同标题正文页
- 如果文档很短，可省略独立 `agenda`

### 章节标题

默认映射：

- `##` 或同等级章节 -> `text-visual / comparison / process`

规则：

- 如果文档总页数大于等于 7，可在章节切换处插入 `section-divider`
- 同一章节内不要连续使用 3 页完全相同的布局

### Bullet List

默认映射：

- 2 到 4 条普通 bullet -> `text-visual`
- 3 到 5 条存在明确顺序 -> `process`
- 两组 bullet 明显对照 -> `comparison`

规则：

- 每页 bullet 默认不超过 4 条
- 单条 bullet 默认不超过 18 到 24 个汉字的密度

### 表格

默认映射：

- Markdown table -> `comparison`

规则：

- 列数过多时优先转成双栏摘要，而不是硬塞完整表格
- 只保留最值得展示的 3 到 5 行

### Mermaid

默认映射：

- `mermaid` 流程图 -> `process`
- `mermaid` 架构图 -> `text-visual`
- `mermaid` 时序或状态图 -> `text-visual` 或 `section-divider`

规则：

- Mermaid 是页内表达技术，不单独占一个新页型
- 优先输出 SVG 再交给 renderer 放入页面

### 代码块

默认映射：

- 短代码块 + 解释 -> `text-visual`
- 需要强调一句关键实现 -> `quote`

规则：

- 一页代码行数默认不超过 8 到 12 行
- 不把整段长代码原样搬进 PPT

### 公式

默认映射：

- 单个核心公式 -> `quote`
- 公式 + 解释 -> `text-visual`

规则：

- 公式页默认只承载一个关键公式
- 必须配一句“这条公式说明什么”

## 版式重复控制

为了避免“每页都像一个模板”，第二版建议至少遵守这些约束：

1. `agenda` 之后的前两页不要连续使用相同布局
2. 连续正文页中，相同布局最多连续出现 2 次
3. 出现 `process` 或 `comparison` 后，下一页优先切到 `text-visual / quote / section-divider`
4. `summary / closing` 不再复用普通正文模板
5. 长文档中每 3 到 4 页应该出现一次明显节奏变化

## 密度预算

第二版建议把单页信息量限制在可讲述范围内：

### cover

- 标题 1 行
- 副标题 1 到 2 行
- 不放正文段落

### agenda

- 3 到 5 项
- 每项尽量是短语

### text-visual

- bullet 2 到 4 条
- paragraph 1 段
- 图示 1 个

### comparison

- 左右各 2 到 4 条
- 每栏只讲一个中心主题

### process

- 3 到 5 步
- 每步 1 行短语

### quote

- 1 个核心句
- 可配 1 行解释

### summary / closing

- 3 条 takeaway
- 1 个 action 或结束句

## 多轮迭代原则

### Round 1

- 先生成清晰结构
- 确保页型分配正确

### Round 2

- 优化说服力
- 拉开不同页型的视觉差异

### Round 3

- 压缩冗余文字
- 增强演讲感和收尾感

## 当前规划建议

近期优先级建议：

1. 巩固 8 类页面角色 / 布局类型
2. 完善 `visual-plan.json`
3. 优先接入 `mermaid / svg / table / code-block`
4. 再接入 `formula`
5. 最后再考虑更复杂的设计系统和自动 review
