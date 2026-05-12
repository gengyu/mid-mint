# Docs

本文档目录采用面向 AI 编程协作的分层结构。

## 阅读顺序

1. [../AGENTS.md](../AGENTS.md)
2. [product/V4_DSL_FIRST_PLAN.md](product/V4_DSL_FIRST_PLAN.md)
3. [product/TASKS.md](product/TASKS.md)
4. [architecture/PPT_DSL.md](architecture/PPT_DSL.md)
5. [reference/FILE_CONTRACTS.md](reference/FILE_CONTRACTS.md)
6. [process/AI_PROJECT_MANAGEMENT.md](process/AI_PROJECT_MANAGEMENT.md)
7. [archive/V3_REQUIREMENTS_ARCHIVE.md](archive/V3_REQUIREMENTS_ARCHIVE.md)

## 目录职责

```txt
docs/
├── product/       产品目标、版本计划、任务清单
├── architecture/  核心架构、DSL 协议、ADR
├── reference/     文件契约、接口、稳定参考
├── process/       AI 项目管理和协作流程
└── archive/       历史版本和废弃方案
```

## 维护规则

- 新需求先进入 `product/TASKS.md`
- 影响版本目标时更新 `product/V4_DSL_FIRST_PLAN.md`
- 影响 DSL 时更新 `architecture/PPT_DSL.md`
- 影响产物结构时更新 `reference/FILE_CONTRACTS.md`
- 影响协作方式时更新 `process/AI_PROJECT_MANAGEMENT.md`
- 重大架构决策写入 `architecture/adr/`
- 过期内容移入 `archive/`，不要留在当前主路径
