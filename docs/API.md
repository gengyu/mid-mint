# API.md

## API 接口文档

Base URL: `http://localhost:3000/api`

---

## 1. 项目管理

### 1.1 创建项目

**请求：**
```http
POST /projects
Content-Type: application/json

{
  "name": "我的 PPT 项目",
  "description": "项目描述（可选）"
}
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "id": "proj_abc123",
    "name": "我的 PPT 项目",
    "description": "项目描述（可选）",
    "status": "draft",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

---

### 1.2 获取项目列表

**请求：**
```http
GET /projects?page=1&limit=10&status=draft
```

**查询参数：**
- `page` - 页码（默认 1）
- `limit` - 每页数量（默认 10，最大 100）
- `status` - 状态过滤（draft / processing / completed / failed）

**响应：**
```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "proj_abc123",
        "name": "我的 PPT 项目",
        "status": "completed",
        "slideCount": 10,
        "createdAt": "2024-01-15T10:30:00Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

### 1.3 获取项目详情

**请求：**
```http
GET /projects/:id
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "id": "proj_abc123",
    "name": "我的 PPT 项目",
    "description": "项目描述",
    "status": "completed",
    "document": {
      "originalName": "document.md",
      "parsedAt": "2024-01-15T10:31:00Z"
    },
    "analysis": {
      "mainTopic": "主要主题",
      "analyzedAt": "2024-01-15T10:32:00Z"
    },
    "deckPlan": {
      "totalSlides": 10,
      "plannedAt": "2024-01-15T10:33:00Z"
    },
    "output": {
      "pptxPath": "/outputs/proj_abc123/presentation.pptx",
      "generatedAt": "2024-01-15T10:35:00Z"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

### 1.4 更新项目

**请求：**
```http
PATCH /projects/:id
Content-Type: application/json

{
  "name": "新的项目名称",
  "description": "新的描述"
}
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "id": "proj_abc123",
    "name": "新的项目名称",
    "updatedAt": "2024-01-15T11:00:00Z"
  }
}
```

---

### 1.5 删除项目

**请求：**
```http
DELETE /projects/:id
```

**响应：**
```json
{
  "code": 200,
  "message": "项目已删除"
}
```

---

## 2. 文档上传

### 2.1 上传文档

**请求：**
```http
POST /projects/:id/document
Content-Type: multipart/form-data

file: <文件>
```

**支持格式：**
- `.md` (Markdown)
- `.txt` (纯文本)
- `.docx` (Word)
- `.html` (HTML)

**响应：**
```json
{
  "code": 200,
  "data": {
    "projectId": "proj_abc123",
    "fileName": "document.md",
    "fileSize": 10240,
    "parsedSections": 15,
    "uploadedAt": "2024-01-15T10:31:00Z"
  }
}
```

---

### 2.2 直接输入文本

**请求：**
```http
POST /projects/:id/document/text
Content-Type: application/json

{
  "content": "# 标题\n\n这是内容...",
  "format": "markdown"
}
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "projectId": "proj_abc123",
    "parsedSections": 15,
    "uploadedAt": "2024-01-15T10:31:00Z"
  }
}
```

---

## 3. PPT 生成

### 3.1 触发 PPT 生成

**请求：**
```http
POST /projects/:id/generate
Content-Type: application/json

{
  "targetSlides": 10,
  "style": "professional",
  "theme": "clean-light"
}
```

**请求参数：**
- `targetSlides` - 目标页数（可选，默认 10）
- `style` - 风格（可选：professional / casual / inspirational）
- `theme` - 主题（可选：clean-light / tech-dark / consulting）

**响应：**
```json
{
  "code": 200,
  "data": {
    "jobId": "job_xyz789",
    "status": "queued",
    "message": "PPT 生成任务已加入队列"
  }
}
```

---

### 3.2 查询任务状态

**请求：**
```http
GET /jobs/:jobId
```

**响应（处理中）：**
```json
{
  "code": 200,
  "data": {
    "jobId": "job_xyz789",
    "status": "active",
    "progress": 60,
    "currentStep": "render-pptx",
    "totalSteps": 8,
    "completedSteps": 5,
    "startedAt": "2024-01-15T10:32:00Z"
  }
}
```

**响应（完成）：**
```json
{
  "code": 200,
  "data": {
    "jobId": "job_xyz789",
    "status": "completed",
    "progress": 100,
    "completedAt": "2024-01-15T10:35:00Z",
    "result": {
      "pptxPath": "/outputs/proj_abc123/presentation.pptx",
      "slideCount": 10
    }
  }
}
```

**响应（失败）：**
```json
{
  "code": 200,
  "data": {
    "jobId": "job_xyz789",
    "status": "failed",
    "error": "LLM API 调用失败",
    "failedAt": "2024-01-15T10:33:00Z"
  }
}
```

---

### 3.3 取消任务

**请求：**
```http
POST /jobs/:jobId/cancel
```

**响应：**
```json
{
  "code": 200,
  "message": "任务已取消"
}
```

---

## 4. PPT 导出

### 4.1 下载 PPTX

**请求：**
```http
GET /projects/:id/export
```

**响应：**
- Content-Type: `application/vnd.openxmlformats-officedocument.presentationml.presentation`
- Content-Disposition: `attachment; filename="presentation.pptx"`
- Body: PPTX 文件二进制数据

---

### 4.2 获取 Slide 预览

**请求：**
```http
GET /projects/:id/slides
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "slides": [
      {
        "slideNumber": 1,
        "type": "cover",
        "title": "封面标题",
        "subtitle": "副标题",
        "bullets": [],
        "previewImage": "/outputs/proj_abc123/slide-1.png"
      },
      {
        "slideNumber": 2,
        "type": "content",
        "title": "第一页标题",
        "bullets": [
          { "text": "要点 1", "level": 0 },
          { "text": "要点 2", "level": 0 }
        ],
        "previewImage": "/outputs/proj_abc123/slide-2.png"
      }
    ]
  }
}
```

---

## 5. 模板和主题

### 5.1 获取可用布局

**请求：**
```http
GET /templates/layouts
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "layouts": [
      {
        "name": "cover",
        "description": "封面布局",
        "preview": "/templates/layouts/cover-preview.png"
      },
      {
        "name": "title-bullets",
        "description": "标题+要点布局",
        "preview": "/templates/layouts/title-bullets-preview.png"
      }
    ]
  }
}
```

---

### 5.2 获取可用主题

**请求：**
```http
GET /templates/themes
```

**响应：**
```json
{
  "code": 200,
  "data": {
    "themes": [
      {
        "name": "clean-light",
        "description": "简洁浅色主题",
        "preview": "/templates/themes/clean-light-preview.png"
      },
      {
        "name": "tech-dark",
        "description": "科技深色主题",
        "preview": "/templates/themes/tech-dark-preview.png"
      }
    ]
  }
}
```

---

## 6. 错误响应

所有错误响应遵循统一格式：

```json
{
  "code": 400,
  "message": "错误信息",
  "details": {
    "field": "错误详情"
  }
}
```

### 常见错误码

- `400` - 请求参数错误
- `404` - 资源不存在
- `409` - 冲突（如重复操作）
- `422` - 验证失败
- `429` - 请求过于频繁
- `500` - 服务器内部错误

---

## 7. 认证（未来扩展）

当前版本无需认证。未来可添加：

```http
Authorization: Bearer <token>
```

---

## 8. 速率限制

- 默认：100 请求/分钟
- PPT 生成：10 任务/小时

超出限制返回 `429 Too Many Requests`。

---

## 9. Swagger 文档

启动应用后访问：

```
http://localhost:3000/api/docs
```

可查看交互式 API 文档。
