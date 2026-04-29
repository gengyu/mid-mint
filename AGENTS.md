# AGENTS.md

## 1. 项目目标

这是一个基于 NestJS 的本地优先 AI PPT 生成服务。

当前进入 PPT 第四版开发阶段，目标是建立一条稳定的 `DSL-first` 主链路：

```txt
Document -> PPT DSL -> 可讲 PPT
```

第四版不继续沿固定模板方向扩展，而是设计并落地一套类似前端设计语言的 PPT 描述语言。

核心产物：

```txt
ppt-dsl.json
```

## 2. 第四版目标

- 接收 `Markdown / Txt / HTML`
- 解析文档结构
- 分析内容、受众、叙事结构和页数
- 生成统一的 `ppt-dsl.json`
- 用 `design` 描述整套 PPT 的风格体系、主题样式和 design tokens
- 用 `slides[*].layout / slots / elements / constraints` 描述页面结构
- 支持多轮 refinement，并逐轮修改 DSL
- 根据 DSL 生成 SVG / Mermaid / Formula 等稳定资产
- renderer 优先解释 DSL 并导出 `.pptx`
- 将输入、中间产物和输出文件保存到项目目录

## 3. 第四版范围

### 必须完成

1. 创建项目
2. 保存输入文档
3. 解析 `Markdown / Txt / HTML`
4. 生成 `parsed-document.json`
5. 生成 `content-analysis.json`
6. 生成 `ppt-dsl.json`
7. 生成 `iterations/round-xx/ppt-dsl.json`
8. 生成视觉素材文件
9. 从 DSL 渲染 `.pptx`
10. 不再生成旧 `deck-plan / design-plan / layout-plan / visual-plan / slide-specs`

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
- 真实图片生成链路
- 复杂插件系统

## 4. 主流程

目标流程：

```txt
Document
  -> Parse
  -> Analyze
  -> PPT DSL Draft
  -> Refine PPT DSL
  -> Asset Plan
  -> Generate Assets
  -> Render From DSL
```

## 5. PPT DSL 原则

- `ppt-dsl.json` 是 renderer 的主要输入
- 页面不是模板实例，而是元素树、slots、constraints 和 design tokens 的组合
- 模型不直接生成复杂 PPT 坐标
- renderer 只解释 DSL，不做叙事规划和设计决策
- 用户不传页数，页数由模型根据内容判断
- 不走真实图片链路，优先 SVG / Mermaid / Formula 等稳定资产

`ppt-dsl.json` 分层：

```txt
ppt-dsl
├── deck        叙事与演讲目标
├── design      全局风格体系
├── slides      页面结构和元素树
├── assets      生成或渲染后的素材引用
└── constraints 全局渲染约束
```

## 6. 最重要的架构边界

- `projects`
  只负责创建项目、查看项目、触发生成
- `pipeline`
  只负责串联第四版主流程
- `parser`
  只负责把输入文档转成结构化文档
- `llm`
  只负责模型调用和结构化 JSON 输出
- `ppt-dsl`
  负责 DSL 类型、DSL Builder、DSL refinement、DSL validation
- `assets`
  负责根据 DSL 生成 SVG / Mermaid / Formula 资产
- `renderer`
  只负责解释 DSL 并渲染 `.pptx`
- `storage`
  只负责项目目录与产物读写

## 7. 依赖使用规则

- 能用成熟开源框架和库解决的问题，就不要自己重复造轮子
- LLM 调用使用官方 SDK 或成熟封装
- 文档解析使用成熟解析库
- PPT 生成使用成熟 PPT 库
- Mermaid / HTML / 公式等表达优先使用成熟库
- 只有在没有合适库、或引入库会显著增加复杂度时，才允许自己写最小实现

## 8. 禁止事项

- 不要在 Controller 写业务逻辑
- 不要在多个模块里重复调用 LLM
- 不要引入复杂插件系统
- 不要为了抽象而抽象
- 不要先写大量空壳文件再慢慢补
- 不要继续围绕固定模板扩展 renderer
- 不要让 `slide-specs.json` 成为第四版最终核心协议
- 不要让 `pipeline`、`projects`、`renderer` 互相吞并职责

## 9. 文件产物约定

所有生成结果写入：

```txt
data/projects/<projectId>/
```

第四版目标结构：

```txt
data/projects/<projectId>/
├── input.md | input.txt | input.html
├── project.json
├── parsed-document.json
├── content-analysis.json
├── ppt-dsl.json
├── iterations/
│   ├── round-01/
│   │   ├── objective.json
│   │   └── ppt-dsl.json
│   ├── round-02/
│   │   ├── objective.json
│   │   └── ppt-dsl.json
│   └── round-xx/
├── assets/
│   ├── slide-002.svg
│   └── ...
└── output/
    └── presentation.pptx
```

## 10. 开发顺序

AI 编程工具默认按这个顺序建立上下文并推进：

1. `AGENTS.md`
2. `README.md`
3. `docs/README.md`
4. `docs/product/V4_DSL_FIRST_PLAN.md`
5. `docs/product/TASKS.md`
6. `docs/process/AI_PROJECT_MANAGEMENT.md`
7. `docs/architecture/PPT_DSL.md`
8. `docs/reference/FILE_CONTRACTS.md`
9. `docs/archive/V3_REQUIREMENTS_ARCHIVE.md`
10. `examples/sample.md`
11. `src/modules/ppt-dsl/ppt-dsl.types.ts`
12. `src/modules/pipeline/pipeline.service.ts`
13. `src/modules/renderer/pptx-renderer.service.ts`

## 11. 任务管理规则

- 新需求先写入 `docs/product/TASKS.md`
- 影响架构的需求同步更新 `docs/product/V4_DSL_FIRST_PLAN.md`
- 影响产物结构的需求同步更新 `docs/reference/FILE_CONTRACTS.md`
- 影响 DSL 的需求同步更新 `docs/architecture/PPT_DSL.md`
- 每个任务必须有验收标准
- 每个任务完成后必须跑对应验证
- 不依赖聊天记录作为长期需求来源

## 12. 完成后的汇报格式

完成任务后，请优先汇报：

1. 修改了哪些文件
2. 为什么这么改
3. 如何运行
4. 如何验证
5. 还有哪些 TODO
