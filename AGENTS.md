# AGENTS.md

## 1. 项目目标

这是一个基于 NestJS 的本地优先 AI PPT 生成服务。

当前进入 PPT 第二版开发阶段，目标是建立一条稳定的“文档 -> 可讲 PPT”主链路，而不是只生成能打开的 PPT 文件。

第二版目标：

- 接收 `Markdown / Docx / Txt / HTML`
- 解析文档结构
- 分析内容并生成演示规划
- 先判断页面角色 / 布局类型
- 再决定页面内部表达技术
- 支持多轮 refinement
- 渲染并导出 `.pptx`
- 将输入、中间产物和输出文件保存到项目目录

## 2. 第二版范围

### 必须完成

1. 创建项目
2. 保存输入文档
3. 解析 `Markdown / Docx / Txt / HTML`
4. 生成 `parsed-document.json`
5. 生成 `content-analysis.json`
6. 生成 `deck-plan.json`
7. 生成 `visual-plan.json`
8. 生成 `slide-specs.json`
9. 生成 `iterations/round-xx/slide-specs.json`
10. 生成视觉素材文件
11. 生成 `.pptx`

### 当前不做

- 单元测试、E2E、eslint、prettier 整治
- BullMQ / Redis / 异步队列
- Reviewer / Auto-fix 平台
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
Document
  -> Parse
  -> Analyze
  -> Deck Plan
  -> Visual Plan
  -> Slides
  -> Refine
  -> Assets
  -> Render
```

## 4. 第二版页面规则

第二版统一采用两层结构：

1. 页面角色 / 布局类型
2. 页面内部表达技术

当前固定 8 类页面角色 / 布局类型：

1. `cover`
2. `agenda`
3. `section-divider`
4. `text-visual`
5. `comparison`
6. `process`
7. `quote`
8. `summary / closing`

这些不是固定页数，而是固定页型集合。

页面内部表达技术当前重点考虑：

- `bullets`
- `mermaid`
- `svg`
- `table`
- `code-block`
- `formula`
- `image`

## 5. 最重要的架构边界

- `projects`
  只负责创建项目、查看项目、触发生成
- `pipeline`
  只负责串联主流程，不承载存储细节
- `parser`
  只负责把输入文档转成结构化文档
- `llm`
  只负责内容分析、规划、结构化输出
- `visuals`
  只负责视觉规划与视觉素材生成
- `slides`
  只负责生成逐页内容定义
- `renderer`
  只负责根据 slide specs 渲染 `.pptx`
- `storage`
  只负责项目目录与产物读写

## 6. 依赖使用规则

- 能用成熟开源框架和库解决的问题，就不要自己重复造轮子
- 优先使用社区成熟、维护稳定、文档完整的库，特别是：
  - LLM 调用使用官方 SDK 或成熟封装
  - 文档解析使用成熟解析库
  - PPT 生成使用成熟 PPT 库
  - Mermaid / HTML / Docx / 公式等内容表达优先使用成熟库
- 只有在没有合适库、或引入库会显著增加复杂度时，才允许自己写最小实现
- 如果保留自写实现，必须先说明为什么不能直接用现成库

## 7. 禁止事项

- 不要在 Controller 写业务逻辑
- 不要在多个模块里重复调用 LLM
- 不要引入复杂插件系统
- 不要为了抽象而抽象
- 不要先写大量空壳文件再慢慢补
- 不要偏离主链路去做与第二版无关的能力
- 不要让 `pipeline`、`projects`、`renderer` 互相吞并职责

## 8. 文件产物约定

所有生成结果写入：

```txt
data/projects/<projectId>/
```

参考结构：

```txt
data/projects/<projectId>/
├── input.md | input.txt | input.docx | input.html
├── project.json
├── parsed-document.json
├── content-analysis.json
├── deck-plan.json
├── visual-plan.json
├── slide-specs.json
├── iterations/
│   ├── round-01/
│   │   ├── objective.json
│   │   └── slide-specs.json
│   └── round-02/
│       ├── objective.json
│       └── slide-specs.json
├── assets/
│   ├── slide-002.svg
│   └── ...
└── output/
    └── presentation.pptx
```

## 9. 开发顺序

AI 编程工具默认按这个顺序建立上下文并推进：

1. `AGENTS.md`
2. `README.md`
3. `docs/PPT_V2_LAYOUTS.md`
4. `docs/IMPLEMENTATION_PLAN.md`
5. `docs/FILE_CONTRACTS.md`
6. `docs/API.md`
7. `examples/sample.md`
8. `src/modules/projects/projects.controller.ts`
9. `src/modules/pipeline/pipeline.service.ts`
10. `src/modules/renderer/pptx-renderer.service.ts`

## 10. 完成后的汇报格式

完成任务后，请优先汇报：

1. 修改了哪些文件
2. 为什么这么改
3. 如何运行
4. 如何验证
5. 还有哪些 TODO
