# MVP.md

## 目标

第一版只做一件事：

把一段 `Markdown / Txt` 文案转换为一个可打开的 `.pptx`，并把中间产物保存到项目目录中。

## 输入与输出

输入：

- `Markdown`
- `Txt`

输出：

- 一个 `.pptx`
- 一组可检查的 JSON 中间产物
- 少量 SVG 图示素材

## 必须完成

- 创建项目
- 保存原始输入
- 解析 `Markdown / Txt`
- 生成 `content-analysis.json`
- 生成 `deck-plan.json`
- 生成 `slide-specs.json`
- 生成少量 SVG 图示
- 输出 `.pptx`

## 明确不做

- BullMQ / Redis / 异步队列
- TypeORM / PostgreSQL
- Reviewer / Auto-fix
- Export 独立模块
- 复杂主题引擎和模板 DSL
- 多租户 / 多环境 / 多数据库设计
- PDF / Notion / Confluence 导入
- 在线预览编辑
- 大规模工程化整治

## 技术原则

- 简单优先
- 文件系统优先
- JSON 中间产物优先
- AI 友好优先
- 先跑通再优化

## 当前主链路

```txt
Create Project
  -> Save Input
  -> Parse Document
  -> Analyze Content
  -> Plan Deck
  -> Write Slides
  -> Generate Assets
  -> Render PPTX
```

## 验收标准

项目目录中至少出现：

```txt
input.md 或 input.txt
parsed-document.json
content-analysis.json
deck-plan.json
slide-specs.json
assets/slide-002.svg
output/<title>.pptx
```
