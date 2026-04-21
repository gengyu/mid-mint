# MVP.md

## 目标

第一版只解决“从文案到 PPTX”的最短闭环。

输入：

- `Markdown`
- `Txt`

输出：

- 一个可以打开的 `.pptx`
- 一组可检查的 JSON 中间产物

## 核心价值

1. 跑通业务主链路
2. 降低 AI 编程成本
3. 避免在非核心工程化上消耗时间

## 必须支持

- 项目创建
- 原始文案保存
- Markdown/Txt 解析
- LLM 结构化输出
- Deck Plan 生成
- Slide Specs 生成
- 简单视觉素材生成
- PPTX 导出

## 暂不支持

- BullMQ / Redis
- TypeORM / PostgreSQL
- 复杂模板系统
- 多模型深度抽象
- Reviewer / Auto-fix
- HTML 转图片的大型渲染链
- 在线编辑
- 多租户、多权限

## 技术原则

### 简单优先

能直接写清楚的逻辑，不要过度拆分。

### 现成库优先

能用成熟库解决的，绝不自己重写。

### 文件系统优先

第一版默认用项目目录保存状态和中间产物。

### AI 友好优先

让 AI 工具能通过少数几个文件快速理解项目。

## 建议依赖

- `marked`
- `pptxgenjs`
- `mammoth`
- `mermaid` / `@mermaid-js/mermaid-cli`
- `better-sqlite3`（仅当需要）

## 验收标准

### 输入

用户提交一段 Markdown 或 Txt 文案。

### 处理

系统能够完成：

1. 解析
2. 规划
3. 生成 slides
4. 输出图示
5. 输出 PPTX

### 结果

项目目录中至少出现：

```txt
input.md
parsed-document.json
content-analysis.json
deck-plan.json
slide-specs.json
output/presentation.pptx
```
