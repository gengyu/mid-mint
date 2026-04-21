# API.md

## 当前接口

Base URL: `http://localhost:3000`

当前只维护已经存在的最小接口，不描述未实现能力。

## POST /projects

创建项目并保存输入文案。

请求：

```json
{
  "title": "RAG Demo",
  "content": "# RAG Engineering\n\nSome markdown...",
  "sourceType": "markdown"
}
```

字段：

- `title` 可选，项目标题
- `content` 必填，原始 Markdown 或 Txt 文案
- `sourceType` 可选，`markdown` 或 `txt`

响应示例：

```json
{
  "success": true,
  "data": {
    "id": "rag-demo-20260421-ab12cd",
    "title": "RAG Demo",
    "sourceType": "markdown",
    "createdAt": "2026-04-21T13:00:00.000Z",
    "updatedAt": "2026-04-21T13:00:00.000Z",
    "status": "draft"
  }
}
```

## GET /projects

返回当前项目列表。

响应示例：

```json
{
  "success": true,
  "data": [
    {
      "id": "rag-demo-20260421-ab12cd",
      "title": "RAG Demo",
      "sourceType": "markdown",
      "createdAt": "2026-04-21T13:00:00.000Z",
      "updatedAt": "2026-04-21T13:00:00.000Z",
      "status": "draft"
    }
  ]
}
```

## GET /projects/:projectId

返回单个项目记录。

响应示例：

```json
{
  "success": true,
  "data": {
    "id": "rag-demo-20260421-ab12cd",
    "title": "RAG Demo",
    "sourceType": "markdown",
    "createdAt": "2026-04-21T13:00:00.000Z",
    "updatedAt": "2026-04-21T13:10:00.000Z",
    "status": "generated",
    "outputFile": "/abs/path/data/projects/rag-demo-20260421-ab12cd/output/rag-engineering.pptx"
  }
}
```

## POST /projects/:projectId/generate

执行主流程，生成中间产物、图示素材和最终输出文件。

请求：

```json
{
  "requestedSlides": 5
}
```

字段：

- `requestedSlides` 可选，范围意图为 `3-10`

响应示例：

```json
{
  "success": true,
  "data": {
    "projectId": "rag-demo-20260421-ab12cd",
    "title": "RAG Engineering",
    "deckPlan": {
      "title": "RAG Engineering",
      "totalSlides": 5,
      "slides": []
    },
    "slideSpecs": [],
    "outputFile": "/abs/path/data/projects/rag-demo-20260421-ab12cd/output/rag-engineering.pptx"
  }
}
```

## 生成结果目录

每次生成都会把输入、中间产物和输出文件写到：

```txt
data/projects/<projectId>/
```

目录中的关键文件包括：

- `input.md` 或 `input.txt`
- `project.json`
- `parsed-document.json`
- `content-analysis.json`
- `deck-plan.json`
- `slide-specs.json`
- `assets/slide-00x.svg`
- `output/<title>.pptx`

## 错误响应

当前项目没有单独包装复杂错误协议，NestJS 默认会返回标准 HTTP 错误响应。

最常见的是：

- `404` 项目不存在
- `400` 请求体格式错误
- `500` 服务端执行失败
