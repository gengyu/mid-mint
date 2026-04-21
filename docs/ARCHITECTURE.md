# ARCHITECTURE.md

## 系统架构概览

```
┌─────────────────────────────────────────────────────────┐
│                     Client (HTTP)                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  NestJS Application                      │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │   Projects   │    │    Export    │                   │
│  │  Controller  │    │  Controller  │                   │
│  └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                            │
│         └────────┬──────────┘                            │
│                  ▼                                       │
│  ┌──────────────────────────────────────┐               │
│  │        Pipeline Service              │               │
│  │  (Orchestrate Generation Workflow)   │               │
│  └──┬───┬────┬─────┬──────┬─────┬──────┘               │
│     │   │    │     │      │     │                       │
│     ▼   ▼    ▼     ▼      ▼     ▼                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐         │
│  │Parser│ │Analyzer│ │Planner│ │Slides│ │Visuals│      │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘         │
│                                              │          │
│                                              ▼          │
│                                         ┌──────────┐   │
│                                         │Renderer  │   │
│                                         └────┬─────┘   │
│                                              │          │
│                                              ▼          │
│                                         ┌──────────┐   │
│                                         │ Storage  │   │
│                                         └──────────┘   │
└─────────────────────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 External Services                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │   LLM    │  │  Redis   │  │File System│              │
│  │ (Ollama/ │  │ (BullMQ) │  │ (tmp/    │              │
│  │ OpenAI)  │  │          │  │ outputs) │              │
│  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────┘
```

---

## 核心模块说明

### 1. Projects Module (`src/modules/projects/`)

**职责：** 项目管理 CRUD

- `ProjectsController` - HTTP 接口
- `ProjectsService` - 业务逻辑
- `ProjectEntity` - 数据模型（TypeORM）

**API:**
- `POST /projects` - 创建项目
- `GET /projects` - 获取项目列表
- `GET /projects/:id` - 获取项目详情
- `DELETE /projects/:id` - 删除项目

---

### 2. Parser Module (`src/modules/parser/`)

**职责：** 文档解析

- `ParserService` - 统一解析入口
- `MarkdownParser` - Markdown 解析
- `DocxParser` - Word 文档解析
- `TxtParser` - 纯文本解析
- `HtmlParser` - HTML 解析

**输出：** `ParsedDocument` 类型（结构化文档）

---

### 3. Analyzer Module (`src/modules/analyzer/`)

**职责：** 内容分析（LLM）

- `AnalyzerService` - 调用 LLM 分析文档
- 提取关键信息、主题、章节结构
- 生成内容摘要

**输入：** `ParsedDocument`  
**输出：** `ContentAnalysis` 类型

---

### 4. Planner Module (`src/modules/planner/`)

**职责：** Deck 大纲规划

- `DeckPlannerService` - 生成 PPT 大纲
- 决定页数、每页主题、章节分布

**输入：** `ContentAnalysis`  
**输出：** `DeckPlan` 类型（包含 PlannedSlide[]）

---

### 5. Visuals Module (`src/modules/visuals/`)

**职责：** 视觉规划

- `VisualPlannerService` - 规划每页的视觉呈现
- 选择布局模板（封面、目录、内容、对比等）
- 规划图表、图片占位

**输入：** `DeckPlan`  
**输出：** `VisualPlan` 类型

---

### 6. Slides Module (`src/modules/slides/`)

**职责：** Slide 详细内容生成

- `SlideSpecService` - 为每页生成详细内容
- 生成标题、副标题、正文要点
- 生成演讲者备注

**输入：** `PlannedSlide` + `VisualPlan`  
**输出：** `SlideSpec` 类型

---

### 7. Renderer Module (`src/modules/renderer/`)

**职责：** PPTX 渲染引擎

- `PptxRendererService` - 主渲染服务
- `LayoutEngineService` - 布局引擎
- `ThemeEngineService` - 主题引擎
- `TextFitService` - 文本适配
- `AssetInserterService` - 图片插入

**输入：** `SlideSpec[]` + 模板 + 主题  
**输出：** PPTX 文件（Buffer）

---

### 8. Storage Module (`src/modules/storage/`)

**职责：** 文件存储管理

- `ProjectStorageService` - 项目文件存储
- `AssetStorageService` - 素材存储
- `ArtifactStorageService` - 生成产物存储

**存储位置：**
- `data/projects/{projectId}/` - 项目数据
- `tmp/` - 临时文件
- `outputs/` - 输出文件

---

### 9. Jobs Module (`src/jobs/`)

**职责：** 异步任务队列

- `GenerationJobService` - PPT 生成任务
- `JobStatusStore` - 任务状态管理
- 使用 BullMQ + Redis

**任务流程：**
```
Create Job → Queue → Process → Update Status → Complete/Fail
```

---

### 10. Pipeline Module (`src/modules/pipeline/`)

**职责：** 编排整个生成流程

- `PipelineService` - 主流程编排
- `PipelineRunner` - 执行各个步骤

**步骤：**
1. `ParseDocumentStep` - 解析文档
2. `AnalyzeContentStep` - 分析内容
3. `PlanDeckStep` - 规划大纲
4. `PlanVisualsStep` - 规划视觉
5. `WriteSlidesStep` - 生成 Slide 内容
6. `RenderPptxStep` - 渲染 PPTX
7. `ReviewDeckStep` - 质量审查（可选）
8. `GenerateAssetsStep` - 生成素材（可选）

---

### 11. LLM Module (`src/modules/llm/`)

**职责：** LLM 调用封装

- `LlmService` - 统一 LLM 接口
- `OpenAiCompatibleProvider` - OpenAI 兼容 API
- `OllamaProvider` - Ollama 本地模型
- `LmStudioProvider` - LM Studio 本地模型

**支持：**
- 文本生成
- JSON 结构化输出
- 多 Provider 切换

---

### 12. Reviewer Module (`src/modules/reviewer/`)

**职责：** 质量审查和自动修复

- `ReviewerService` - 审查生成的内容
- `AutoFixerService` - 自动修复问题

**检查项：**
- 内容完整性
- 格式规范性
- 逻辑连贯性

---

### 13. Export Module (`src/modules/export/`)

**职责：** PPT 导出

- `ExportController` - 导出接口
- `ExportService` - 导出逻辑

**API:**
- `GET /projects/:id/export` - 下载 PPTX

---

## 数据流

```
用户上传文档
    ↓
ProjectsController.create()
    ↓
PipelineService.generatePpt()
    ↓
[Pipeline Steps]
    ↓
JobsModule.enqueue()
    ↓
Redis Queue
    ↓
Worker Process
    ↓
StorageModule.save()
    ↓
更新 Project 状态
    ↓
用户下载
```

---

## 技术选型理由

### 为什么用 TypeORM + SQLite？

- ✅ 开发阶段无需额外数据库
- ✅ 单文件，便于备份和迁移
- ✅ 生产环境可切换到 PostgreSQL

### 为什么用 BullMQ？

- ✅ 基于 Redis，性能高
- ✅ 支持任务优先级、重试、延迟
- ✅ 完善的监控和管理工具

### 为什么用 pptxgenjs？

- ✅ 纯 Node.js，无需 Office 依赖
- ✅ 支持所有基础 PPT 功能
- ✅ 活跃维护，文档完善

### 为什么支持多种 LLM Provider？

- ✅ 灵活性：可使用云端或本地模型
- ✅ 成本控制：可选择性价比最高的方案
- ✅ 隐私保护：本地模型不上传数据

---

## 扩展点

### 如何添加新的文档格式？

1. 在 `src/modules/parser/parsers/` 创建新 Parser
2. 实现 `IParser` 接口
3. 在 `ParserService` 中注册

### 如何添加新的布局模板？

1. 在 `templates/layouts/` 创建 JSON 配置
2. 定义布局和占位符
3. 在 `LayoutEngineService` 中加载

### 如何添加新的 LLM Provider？

1. 在 `src/modules/llm/providers/` 创建新 Provider
2. 实现 `ILlmProvider` 接口
3. 在 `LlmModule` 中注册

---

## 性能优化方向

- 📌 缓存 LLM 响应（相同输入）
- 📌 并行渲染多个 Slide
- 📌 使用 CDN 存储静态资源
- 📌 压缩生成的 PPTX 文件
- 📌 懒加载大型文档
