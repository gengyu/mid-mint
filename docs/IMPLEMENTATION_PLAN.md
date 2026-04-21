# IMPLEMENTATION_PLAN.md

## 实施原则

本计划只描述第一版实现顺序，不描述长期架构。

目标是让 AI 编程工具按固定顺序推进，而不是自由发挥。

## 实施顺序

### Step 1: 启动入口

完成：

- `src/main.ts`
- `src/app.module.ts`

要求：

- NestJS 能启动
- 只注册当前 MVP 需要的模块

### Step 2: Projects 模块

完成：

- `POST /projects`
- `GET /projects`
- `GET /projects/:id`
- `POST /projects/:id/generate`

要求：

- Controller 只负责输入输出
- Service 只负责项目动作和流程触发

### Step 3: Storage 模块

完成：

- 创建项目目录
- 保存输入文件
- 保存 JSON 中间产物
- 保存输出 `.pptx`

要求：

- 默认只用文件系统
- 不引入数据库

### Step 4: Parser 模块

完成：

- 先支持 `Markdown`
- 兼容 `Txt`

要求：

- 先得到稳定的结构化文档
- 优先使用 `marked`

### Step 5: LLM 模块

完成：

- 封装单一默认 LLM 调用
- 输出结构化 JSON

要求：

- 优先走 JSON Schema 或 Structured Output
- 不先做多 Provider 复杂抽象

### Step 6: Pipeline 模块

完成：

- 串联 parse -> analyze -> plan -> slides -> visuals -> render

要求：

- 一条主流程 service
- 每一步都可落文件

### Step 7: Slides 模块

完成：

- 生成 `slide-specs.json`

要求：

- 数据结构稳定
- 不做复杂布局推理

### Step 8: Visuals 模块

完成：

- 生成少量简单图示

要求：

- 优先 SVG
- 如果需要流程图，优先 Mermaid，不自己维护复杂图形 DSL

### Step 9: Renderer 模块

完成：

- 用 `pptxgenjs` 输出最终 `.pptx`

要求：

- 固定 3 到 4 种模板即可
- 不做复杂 theme engine

## 文件优先级

AI 工具优先编辑这些文件：

1. `src/modules/projects/projects.controller.ts`
2. `src/modules/projects/projects.service.ts`
3. `src/modules/pipeline/pipeline.service.ts`
4. `src/modules/parser/parser.service.ts`
5. `src/modules/llm/llm-json.service.ts`
6. `src/modules/slides/slide-spec.service.ts`
7. `src/modules/visuals/svg-generator.service.ts`
8. `src/modules/renderer/pptx-renderer.service.ts`
9. `src/modules/storage/project-storage.service.ts`

## 禁止提前做的事情

- 不要先补测试体系
- 不要先补 lint 和格式化治理
- 不要先补队列
- 不要先补数据库 ORM
- 不要先补 reviewer
- 不要先补复杂异常体系
- 不要先补 export 独立模块
