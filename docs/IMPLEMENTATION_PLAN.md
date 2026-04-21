# IMPLEMENTATION_PLAN.md

## 实施原则

本计划描述第一版主链路的实现顺序，不再使用 MVP 表述。

目标是让开发者和 AI 工具围绕同一条第一版链路推进，减少反复返工和无效抽象。

## 第一版实现顺序

### Step 1: 启动与模块装配

- `src/main.ts`
- `src/app.module.ts`

要求：

- 应用能启动
- 只装配第一版需要的模块
- 模块边界清晰

### Step 2: Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/generate`

要求：

- Controller 只做输入输出
- 项目创建、查询、生成触发放在 `ProjectsService`

### Step 3: Storage

- 创建 `data/projects/<projectId>/`
- 保存输入文件
- 保存 JSON 中间产物
- 保存素材文件
- 保存输出文件

要求：

- 默认只用文件系统
- 不引入数据库
- 目录结构稳定

### Step 4: Parser

- 支持 `markdown`
- 支持 `txt`
- 预留 `docx`
- 预留 `html`

要求：

- 产出稳定的 `ParsedDocument`
- 优先使用成熟解析库
- 不在 parser 中引入业务规划逻辑

### Step 5: Analyze

- 分析内容主题
- 识别关键信息
- 输出结构化分析结果

要求：

- `llm` 模块统一负责
- 不在多个模块重复调用模型
- 没配模型时允许 fallback

### Step 6: Plan

- 生成 Deck 大纲
- 产出页级目标和结构

要求：

- 输出 `deck-plan.json`
- 与 `Analyze` 解耦
- 不把视觉细节塞进 deck plan

### Step 7: Visuals

- 规划整体视觉表达
- 产出每页视觉建议和素材需求
- 生成视觉素材文件

要求：

- 输出 `visual-plan.json`
- 视觉规划和逐页文案拆开
- 优先使用简单、稳定的素材生成方式

### Step 8: Slides

- 生成每页内容定义
- 产出 `slide-specs.json`

要求：

- 每页结构稳定
- slide specs 只描述页面内容和布局数据
- 不在 slides 层承担渲染细节

### Step 9: Render

- 根据 slide specs 生成 `.pptx`

要求：

- 优先保证文件能打开
- 优先使用成熟 PPT 库
- 渲染层只负责 PPT 生成

## 优先阅读和编辑文件

1. `src/modules/projects/projects.controller.ts`
2. `src/modules/projects/projects.service.ts`
3. `src/modules/pipeline/pipeline.service.ts`
4. `src/modules/storage/project-storage.service.ts`
5. `src/modules/parser/parser.service.ts`
6. `src/modules/llm/llm-json.service.ts`
7. `src/modules/visuals/svg-generator.service.ts`
8. `src/modules/slides/slide-spec.service.ts`
9. `src/modules/renderer/pptx-renderer.service.ts`

## 现阶段不要提前做

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
