# AGENTS.md

## 1. 项目目标

这是一个基于 NestJS 的本地优先 AI PPT 生成服务。

当前目标只有一个：

把一段 `Markdown / Txt` 文案转换为一个可打开的 `.pptx`，并把中间产物保存到项目目录中。

## 2. MVP 范围

### 必须完成

1. 创建项目
2. 保存输入文案
3. 解析 `Markdown / Txt`
4. 生成 `parsed-document.json`
5. 生成 `content-analysis.json`
6. 生成 `deck-plan.json`
7. 生成 `slide-specs.json`
8. 生成少量 SVG 图示素材
9. 生成 `.pptx`

### 明确不做

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

## 3. 主流程

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

## 4. 最重要的架构边界

- `projects`
  只负责创建项目、查看项目、触发生成
- `pipeline`
  只负责串联主流程，不承载存储细节
- `parser`
  只负责把输入文案转成结构化文档
- `llm`
  只负责内容分析和结构化输出
- `slides`
  只负责生成 `slide-specs.json`
- `visuals`
  只负责生成简单图示素材
- `renderer`
  只负责输出 `.pptx`
- `storage`
  只负责项目目录与中间产物读写

## 5. 禁止事项

- 不要在 Controller 写业务逻辑
- 不要在多个模块里重复调用 LLM
- 不要引入复杂插件系统
- 不要提前做“多租户 / 多环境 / 多数据库”设计
- 不要先写大量空壳文件再慢慢补
- 不要为了抽象而抽象
- 不要偏离主链路去做非 MVP 能力

## 6. 依赖使用规则

- 能用成熟开源框架和库解决的问题，就不要自己重复造轮子
- 优先使用社区成熟、维护稳定、文档完整的库，特别是：
  - LLM 调用使用官方 SDK 或成熟封装
  - Markdown 解析使用成熟解析库
  - PPT 生成使用成熟 PPT 库
- 只有在没有合适库、或引入库会显著增加复杂度时，才允许自己写最小实现
- 如果保留自写实现，必须优先说明为什么不能直接用现成库

## 7. 文件产物约定

所有生成结果写入：

```txt
data/projects/<projectId>/
```

参考结构：

```txt
data/projects/<projectId>/
├── input.md | input.txt
├── project.json
├── parsed-document.json
├── content-analysis.json
├── deck-plan.json
├── slide-specs.json
├── assets/
│   └── slide-002.svg
└── output/
    └── <title>.pptx
```

## 8. 开发顺序

AI 编程工具默认按这个顺序建立上下文并推进：

1. `AGENTS.md`
2. `README.md`
3. `docs/MVP.md`
4. `docs/IMPLEMENTATION_PLAN.md`
5. `docs/FILE_CONTRACTS.md`
6. `examples/sample.md`
7. `src/modules/projects/projects.controller.ts`
8. `src/modules/pipeline/pipeline.service.ts`
9. `src/modules/renderer/pptx-renderer.service.ts`

## 9. 完成后的汇报格式

完成任务后，请优先汇报：

1. 修改了哪些文件
2. 为什么这么改
3. 如何运行
4. 如何验证
5. 还有哪些 TODO
