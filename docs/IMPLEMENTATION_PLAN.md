# IMPLEMENTATION_PLAN.md

## 实施原则

本计划描述当前 PPT 第二版主链路的实现顺序。

目标是让开发者和 AI 工具围绕“页面角色 / 布局类型 + 页面内部表达技术 + 多轮 refinement”这条主线推进，减少返工和无效抽象。

## 第二版实现顺序

### Step 1: 启动与模块装配

- `src/main.ts`
- `src/app.module.ts`

要求：

- 应用能启动
- 只装配当前阶段需要的模块
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
- 支持 `docx`
- 支持 `html`

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

### Step 6: Deck Plan

- 生成 Deck 大纲
- 产出页级目标和结构

要求：

- 输出 `deck-plan.json`
- 与 `Analyze` 解耦
- 不把视觉细节塞进 deck plan

### Step 7: Visual Plan

- 先决定页面角色 / 布局类型
- 再决定页面内部表达技术
- 输出 `visual-plan.json`

要求：

- 固定 8 类页面角色 / 布局类型
- 不把 Mermaid / SVG / 公式当作新的页面类型
- 视觉规划与逐页文案拆开

### Step 8: Slides

- 生成每页内容定义
- 输出 `slide-specs.json`

要求：

- 每页结构稳定
- 保留 `eyebrow / highlight / notes`
- 不在 slides 层承担渲染细节

### Step 9: Refine

- 支持 1 到 3 轮 refinement
- 每轮落 `iterations/round-xx/slide-specs.json`

要求：

- 第一轮强调结构
- 第二轮强调演讲感
- 第三轮强调精简和收尾

### Step 10: Visual Assets

- 生成 SVG 或其他稳定素材

要求：

- 优先 SVG
- 可逐步接入 `mermaid / table / code-block / formula`
- 一页最多一个主视觉文件

### Step 11: Render

- 根据 slide specs 生成 `.pptx`

要求：

- 优先保证文件能打开
- 支持 8 类页面角色 / 布局类型
- 渲染层只负责 PPT 生成

## 第二版近期迭代计划

### Iteration A: 巩固视觉规划

- 让 `visual-plan.json` 成为真正的设计决策层
- 增加 `visualTechnique / textTechnique / density / composition / visualPriority`
- 明确“哪些页必须图示、哪些页优先文字”

验收：

- `visual-plan.json` 能独立解释每页为什么这么排
- renderer 不再自己猜大部分版式

### Iteration B: 接入高频技术内容

- 优先接 `mermaid`
- 补 `table`
- 补 `code-block`

验收：

- 文档中的 Mermaid、表格、代码块能进入页内表达技术分流
- 不再把这些内容一律降级成普通 bullet

### Iteration C: 强化演讲感

- 给 `quote` 和 `summary / closing` 更多稳定版式
- 强化 `section-divider`
- 控制布局重复

验收：

- 长文档输出不再是连续几页同模板
- 收尾页具备明显结束感

### Iteration D: 技术型页面增强

- 接入 `formula`
- 继续增强 SVG scene 能力
- 视情况补数据卡片、时间线、架构块图

验收：

- 技术文档里的公式和结构图能更自然进入 PPT
- 技术型 deck 不只剩 bullet 和普通说明文

## 优先阅读和编辑文件

1. `src/modules/projects/projects.controller.ts`
2. `src/modules/projects/projects.service.ts`
3. `src/modules/pipeline/pipeline.service.ts`
4. `src/modules/storage/project-storage.service.ts`
5. `src/modules/parser/parser.service.ts`
6. `src/modules/llm/llm-json.service.ts`
7. `src/modules/pipeline/pipeline.types.ts`
8. `src/modules/visuals/svg-generator.service.ts`
9. `src/modules/slides/slide-spec.service.ts`
10. `src/modules/renderer/pptx-renderer.service.ts`

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
- 在没有 visual-plan 的情况下直接让 renderer 自己做设计决策
