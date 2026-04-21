# WORKFLOW.md

## PPT 生成工作流

本文档描述从文档输入到 PPTX 输出的完整流程。

---

## 高层流程

```
┌─────────────┐
│   Document  │  (Markdown / Docx / Txt / HTML)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Parse     │  解析文档结构
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Analyze   │  LLM 分析内容
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Plan      │  生成 Deck 大纲
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Visuals    │  规划视觉呈现
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Slides    │  生成每页内容
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Render    │  渲染为 PPTX
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Export    │  导出文件
└─────────────┘
```

---

## 详细步骤

### Step 1: Parse Document（文档解析）

**模块：** `src/modules/parser/`  
**服务：** `ParserService`

**输入：**
- 原始文档（字符串或文件路径）
- 文档类型（markdown / docx / txt / html）

**处理：**
1. 根据文档类型选择对应的 Parser
2. 解析文档结构：
   - 标题层级（H1, H2, H3...）
   - 段落
   - 列表（有序/无序）
   - 代码块
   - 引用
   - 表格
3. 提取元数据：
   - 标题
   - 作者
   - 创建时间

**输出：** `ParsedDocument` 类型

```typescript
interface ParsedDocument {
  title: string;
  sections: DocumentSection[];
  metadata: Record<string, any>;
}

interface DocumentSection {
  level: number;        // 标题层级
  title: string;        // 标题文本
  content: string;      // 正文内容
  bullets?: string[];   // 列表项
  children?: DocumentSection[]; // 子章节
}
```

---

### Step 2: Analyze Content（内容分析）

**模块：** `src/modules/analyzer/`  
**服务：** `AnalyzerService`

**输入：**
- `ParsedDocument`

**处理：**
1. 构建 Prompt，包含：
   - 文档全文
   - 分析指令
2. 调用 LLM 进行分析
3. 解析 LLM 返回的 JSON

**LLM 任务：**
- 识别核心主题
- 提取关键信息点
- 识别章节结构
- 判断内容类型（技术、商务、教育等）
- 生成内容摘要

**输出：** `ContentAnalysis` 类型

```typescript
interface ContentAnalysis {
  mainTopic: string;           // 主要主题
  keyMessages: KeyMessage[];   // 关键信息
  contentType: string;         // 内容类型
  summary: string;             // 摘要
  suggestedTone: string;       // 建议语调
}

interface KeyMessage {
  title: string;
  description: string;
  priority: number;  // 优先级 1-5
}
```

---

### Step 3: Plan Deck（规划大纲）

**模块：** `src/modules/planner/`  
**服务：** `DeckPlannerService`

**输入：**
- `ContentAnalysis`
- 目标页数（可选，默认 10）
- 风格偏好（可选）

**处理：**
1. 根据内容复杂度和目标页数，决定：
   - 总页数
   - 章节分布
   - 每章页数
2. 生成 Slide 列表：
   - 封面页
   - 目录页
   - 章节页
   - 内容页
   - 总结页
3. 为每页分配主题

**输出：** `DeckPlan` 类型

```typescript
interface DeckPlan {
  title: string;
  subtitle: string;
  totalSlides: number;
  slides: PlannedSlide[];
}

interface PlannedSlide {
  slideNumber: number;
  type: 'cover' | 'toc' | 'section' | 'content' | 'summary';
  title: string;
  subtitle?: string;
  keyPoint: string;  // 该页要表达的核心观点
  section?: string;  // 所属章节
}
```

---

### Step 4: Plan Visuals（规划视觉）

**模块：** `src/modules/visuals/`  
**服务：** `VisualPlannerService`

**输入：**
- `DeckPlan`

**处理：**
1. 为每页选择合适的布局模板：
   - `cover.layout.json` - 封面
   - `title-bullets.layout.json` - 标题+要点
   - `comparison.layout.json` - 对比
   - `process.layout.json` - 流程
   - `summary.layout.json` - 总结
2. 规划视觉元素：
   - 是否需要图表
   - 是否需要图片占位
   - 图标选择
3. 确定颜色方案

**输出：** `VisualPlan` 类型

```typescript
interface VisualPlan {
  theme: string;              // 主题名称
  slides: VisualSlidePlan[];
}

interface VisualSlidePlan {
  slideNumber: number;
  layout: string;             // 布局模板名称
  colorScheme: string;        // 配色方案
  hasChart?: boolean;         // 是否有图表
  hasImage?: boolean;         // 是否有图片
  chartType?: string;         // 图表类型
}
```

---

### Step 5: Write Slides（生成 Slide 内容）

**模块：** `src/modules/slides/`  
**服务：** `SlideSpecService`

**输入：**
- `PlannedSlide[]`
- `VisualPlan`
- `ContentAnalysis`

**处理：**
1. 为每页生成详细内容：
   - 标题和副标题
   - 正文要点（3-6 条）
   - 演讲者备注
2. 确保内容简洁明了
3. 保持逻辑连贯性

**输出：** `SlideSpec[]` 类型

```typescript
interface SlideSpec {
  slideNumber: number;
  type: string;
  layout: string;
  title: string;
  subtitle?: string;
  bullets: SlideBullet[];
  speakerNotes?: string;
  assets?: SlideAsset[];
}

interface SlideBullet {
  text: string;
  level: number;  // 缩进层级
}

interface SlideAsset {
  type: 'image' | 'chart' | 'icon';
  placeholder: string;
  description?: string;
}
```

---

### Step 6: Render PPTX（渲染 PPTX）

**模块：** `src/modules/renderer/`  
**服务：** `PptxRendererService`

**输入：**
- `SlideSpec[]`
- 布局模板（JSON）
- 主题配置（JSON）

**处理：**
1. 初始化 PPTX 文档（pptxgenjs）
2. 加载主题配置：
   - 颜色方案
   - 字体
   - 背景
3. 逐页渲染：
   - 选择布局模板
   - 应用主题样式
   - 填充文本内容
   - 插入图片/图表
   - 调整文本大小（避免溢出）
4. 生成 PPTX Buffer

**子服务：**
- `LayoutEngineService` - 布局引擎
- `ThemeEngineService` - 主题引擎
- `TextFitService` - 文本适配
- `AssetInserterService` - 素材插入

**输出：** PPTX Buffer

---

### Step 7: Review Deck（质量审查）【可选】

**模块：** `src/modules/reviewer/`  
**服务：** `ReviewerService`

**输入：**
- `SlideSpec[]`

**处理：**
1. 检查内容完整性：
   - 是否有空标题
   - 是否有空内容
   - 页数是否符合要求
2. 检查格式规范性：
   - 要点数量是否合理（3-6 条）
   - 文本长度是否适中
3. 检查逻辑连贯性：
   - 章节顺序是否合理
   - 是否有重复内容

**输出：** `ReviewReport` 类型

```typescript
interface ReviewReport {
  passed: boolean;
  issues: ReviewIssue[];
  suggestions: string[];
}

interface ReviewIssue {
  slideNumber: number;
  severity: 'error' | 'warning';
  message: string;
}
```

如果发现问题，可调用 `AutoFixerService` 自动修复。

---

### Step 8: Generate Assets（生成素材）【可选】

**模块：** `src/modules/visuals/generators/`

**处理：**
1. 根据 `SlideAsset` 描述生成图表
2. 调用 AI 生成配图（如集成 DALL-E）
3. 选择图标

**输出：** 图片文件路径

---

### Step 9: Save & Export（保存和导出）

**模块：** `src/modules/storage/` + `src/modules/export/`

**处理：**
1. 保存 PPTX 到 `outputs/` 目录
2. 保存中间产物到 `data/projects/{projectId}/`
3. 更新项目状态为 "completed"
4. 提供下载链接

**输出：** 文件路径 / 下载 URL

---

## 异步任务流程

当用户触发 PPT 生成时，使用异步任务队列：

```
POST /projects/:id/generate
    ↓
创建 Job（BullMQ）
    ↓
返回 Job ID
    ↓
Worker 处理 Job
    ↓
执行 Pipeline Steps
    ↓
更新 Job 状态
    ↓
GET /jobs/:id/status - 查询进度
```

**Job 状态：**
- `queued` - 排队中
- `active` - 处理中
- `completed` - 完成
- `failed` - 失败

**进度反馈：**
```json
{
  "jobId": "xxx",
  "status": "active",
  "progress": 60,
  "currentStep": "render-pptx",
  "totalSteps": 8,
  "completedSteps": 5
}
```

---

## 错误处理

### 解析失败

- 原因：文档格式不支持、文件损坏
- 处理：返回明确错误信息，提示用户上传有效文件

### LLM 调用失败

- 原因：网络问题、API 限流、模型错误
- 处理：重试机制（最多 3 次），失败后返回错误

### 渲染失败

- 原因：模板缺失、数据异常
- 处理：记录日志，返回部分结果或错误

### 任务超时

- 原因：文档过大、LLM 响应慢
- 处理：设置超时时间（默认 5 分钟），超时后标记失败

---

## 扩展工作流

### 如何添加新的处理步骤？

1. 在 `src/modules/pipeline/steps/` 创建新 Step
2. 实现 `IPipelineStep` 接口
3. 在 `PipelineRunner` 中注册

### 如何实现自定义工作流？

1. 创建新的 Pipeline 配置
2. 定义步骤顺序
3. 注入自定义 Step

---

## 监控和日志

### 日志记录

每个步骤都应记录：
- 开始时间
- 结束时间
- 输入数据摘要
- 输出数据摘要
- 错误信息（如有）

### 性能监控

监控指标：
- 每个步骤的耗时
- LLM 调用次数和耗时
- 内存使用情况
- 任务成功率

---

## 最佳实践

✅ **小步验证** - 每个步骤都可独立测试  
✅ **中间产物保存** - 便于调试和恢复  
✅ **幂等性** - 相同输入产生相同输出  
✅ **可恢复性** - 失败后可从断点继续  
✅ **可配置性** - 参数可通过配置文件调整  
