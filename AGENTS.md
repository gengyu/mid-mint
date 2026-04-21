# AGENTS.md

## 项目目标

这是一个基于 NestJS 的本地优先 AI PPT 生成服务。

第一版目标只有一个：

把一段 `Markdown / Txt` 文案转换为一个可以打开的 `.pptx` 文件，并把中间产物保存到项目目录中。

## 第一版范围

### 必须完成

1. 创建项目
2. 保存输入文案
3. 解析 `Markdown / Txt`
4. 调用 LLM 生成结构化结果
5. 生成 `deck-plan.json`
6. 生成 `slide-specs.json`
7. 生成少量图示素材
8. 用 `pptxgenjs` 输出 `.pptx`
9. 把所有中间文件和输出文件写入 `data/projects/<projectId>/`

### 明确不做

- 不做单元测试、E2E、eslint、prettier 整治
- 不做 BullMQ / Redis / 异步队列
- 不做 Reviewer / Auto-fix
- 不做 Export 独立模块
- 不做复杂主题引擎和模板 DSL
- 不做 Repository 层
- 不做 TypeORM / PostgreSQL
- 不做复杂权限、认证、审计
- 不做 PDF / Notion / Confluence 导入
- 不做在线预览编辑
- 不做复杂 HTML 截图链路

## AI 开发原则

这个项目必须适合 Codex、ChatGPT、Claude Code 这类 AI 编程工具持续开发。

因此必须遵守：

1. 少概念  
不要为了“以后扩展”引入过多模块、抽象层、模式和术语。

2. 少边界处理  
第一版只处理主路径，不主动补很多非核心边界逻辑。

3. 少文件跳转  
一项核心能力尽量集中在少量文件内，减少 AI 来回切换上下文。

4. 强输入输出  
每个步骤都要有清晰输入和输出，优先落成 JSON 文件。

5. 先跑通再优化  
先让主流程稳定生成可打开的 PPT，再讨论优化、扩展和抽象。

## 推荐技术选型

### 必须优先复用现成库

- `marked`
  用于 Markdown 解析
- `mammoth`
  二阶段用于 Docx 解析
- `pptxgenjs`
  用于 PPTX 输出
- `mermaid` / `@mermaid-js/mermaid-cli`
  可选，用于流程图或架构图生成
- `better-sqlite3`
  可选，仅当项目元数据确实需要 SQLite 时再引入

### 第一版优先方案

- 输入存储：文件系统
- 中间产物：JSON 文件
- 输出：`pptxgenjs`
- 图示：简单 SVG 或 Mermaid 渲染
- 数据层：默认不用数据库

## 当前推荐结构

```txt
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── utils/
│   └── types/
├── config/
├── modules/
│   ├── projects/
│   ├── pipeline/
│   ├── parser/
│   ├── llm/
│   ├── renderer/
│   ├── storage/
│   ├── slides/
│   └── visuals/
```

## 模块职责

- `projects`
  负责创建项目、查看项目、触发生成
- `pipeline`
  负责串联整个生成流程
- `parser`
  负责把输入文案转成结构化文档
- `llm`
  负责模型调用与结构化输出
- `slides`
  负责生成 `slide-specs`
- `visuals`
  负责生成简单图示素材
- `renderer`
  负责输出 `.pptx`
- `storage`
  负责项目目录与中间产物读写

## 代码约束

### 允许

- 小而直接的 service
- 明确的 DTO
- 固定模板函数
- 文件系统持久化
- 少量必要工具函数

### 不允许

- 在 Controller 写业务逻辑
- 在多个模块里重复调用 LLM
- 引入复杂插件系统
- 提前做“多租户 / 多环境 / 多数据库”设计
- 先写大量空壳文件再慢慢补
- 为了抽象而抽象

## 输出文件约定

所有生成结果写入：

```txt
data/projects/<projectId>/
```

目录结构参考：

```txt
data/projects/<projectId>/
├── input.md
├── parsed-document.json
├── content-analysis.json
├── deck-plan.json
├── slide-specs.json
├── assets/
│   └── slide-002.svg
└── output/
    └── presentation.pptx
```

## Codex 起步顺序

AI 编程工具默认从这些文件开始看：

1. `AGENTS.md`
2. `docs/MVP.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/FILE_CONTRACTS.md`
5. `examples/sample.md`
6. `src/modules/projects/projects.controller.ts`
7. `src/modules/pipeline/pipeline.service.ts`
8. `src/modules/renderer/pptx-renderer.service.ts`

## 完成任务后的汇报格式

完成任务后，请输出：

1. 修改了哪些文件
2. 为什么这么改
3. 如何运行
4. 如何验证
5. 还有哪些 TODO
