# IMPLEMENTATION_PLAN.md

## 实施原则

本计划只描述第一版主链路，不扩展到长期产品设计。

目标是让 AI 工具和开发者都能按固定顺序推进，减少无效抽象。

## 当前实现顺序

### Step 1: 启动与模块装配

- `src/main.ts`
- `src/app.module.ts`

要求：

- 应用能启动
- 只装配当前 MVP 需要的模块

### Step 2: Projects

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/generate`

要求：

- Controller 只做输入输出
- 项目创建和生成触发放在 `ProjectsService`

### Step 3: Storage

- 创建 `data/projects/<projectId>/`
- 保存 `input.md` 或 `input.txt`
- 保存 JSON 中间产物
- 保存输出文件和素材文件

要求：

- 默认只用文件系统
- 不引入数据库

### Step 4: Parser

- 支持 `markdown`
- 支持 `txt`

要求：

- 先产出稳定的 `ParsedDocument`
- 只处理主路径

### Step 5: LLM

- 分析内容
- 生成结构化 JSON

要求：

- 只有一个默认入口
- 不做多 Provider 深抽象
- 没配模型时允许 fallback

### Step 6: Pipeline

- 串联 `parse -> analyze -> plan -> slides -> assets -> render`

要求：

- 一条主流程 service
- 每一步都写文件

### Step 7: Slides

- 生成 `slide-specs.json`

要求：

- 结构稳定
- 模板少而固定

### Step 8: Visuals

- 生成少量 SVG 图示

要求：

- 一页最多一个主图示
- 不做复杂图形 DSL

### Step 9: Renderer

- 输出最终 `.pptx`

要求：

- 优先保证文件能打开
- 不提前做复杂主题系统

## 优先阅读和编辑文件

1. `src/modules/projects/projects.controller.ts`
2. `src/modules/projects/projects.service.ts`
3. `src/modules/pipeline/pipeline.service.ts`
4. `src/modules/storage/project-storage.service.ts`
5. `src/modules/parser/parser.service.ts`
6. `src/modules/llm/llm-json.service.ts`
7. `src/modules/slides/slide-spec.service.ts`
8. `src/modules/visuals/svg-generator.service.ts`
9. `src/modules/renderer/pptx-renderer.service.ts`

## 不要提前做

- 测试体系整治
- lint / prettier 治理
- 队列
- 数据库 ORM
- reviewer
- export 独立模块
- 复杂异常分层
