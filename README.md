# Mid-mint

一个面向本地优先场景的 AI PPT 生成服务。

第一版只追求一件事：

输入一段 `Markdown / Txt` 文案，输出一个可以打开的 `.pptx` 文件。

## 当前定位

这是一个适合 `Codex / ChatGPT / Claude Code` 持续开发的 MVP 项目，不追求完整产品化，不追求复杂架构，不追求一次性做全。

## 第一版原则

- 先跑通主链路，不做无关工程化
- 尽量少写自研逻辑，优先复用成熟库
- 减少模块数量和概念数量
- 优先文件系统，不依赖外部系统
- 所有中间结果尽量落成 JSON，方便 AI 理解和调试

## 第一版主链路

```txt
Create Project
  -> Save Input
  -> Parse Document
  -> LLM Structured Output
  -> Generate Deck Plan
  -> Generate Slide Specs
  -> Generate Simple Visual Assets
  -> Render PPTX
```

## 当前推荐模块

```txt
src/modules/
├── projects/
├── pipeline/
├── parser/
├── llm/
├── slides/
├── visuals/
├── renderer/
└── storage/
```

## 推荐依赖

- `marked`
  Markdown 解析
- `pptxgenjs`
  PPTX 导出
- `mammoth`
  二阶段的 Docx 解析
- `mermaid` / `@mermaid-js/mermaid-cli`
  可选，用于图示生成
- `better-sqlite3`
  可选，仅当确实需要 SQLite 元数据存储时使用

## 明确不做

- BullMQ / Redis
- TypeORM / PostgreSQL
- Reviewer / Auto-fix
- Export 独立模块
- 单元测试、E2E、eslint、性能测试
- 复杂 HTML 转图片渲染链
- 多 Provider 深抽象
- 复杂模板引擎

## 运行产物

```txt
data/projects/<projectId>/
├── input.md
├── parsed-document.json
├── content-analysis.json
├── deck-plan.json
├── slide-specs.json
├── assets/
└── output/
    └── presentation.pptx
```

## AI 开发入口

如果你是 AI 编程工具，请先阅读：

1. `AGENTS.md`
2. `docs/MVP.md`
3. `docs/IMPLEMENTATION_PLAN.md`
4. `docs/FILE_CONTRACTS.md`
5. `examples/sample.md`

## 常用命令

```bash
pnpm install
pnpm build
pnpm dev
```
