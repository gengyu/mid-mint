# API.md

## 说明

本文件描述当前第二版阶段对外暴露的项目接口。

Base URL: `http://localhost:3000`

当前仍以项目维度接口为主，围绕“创建项目 -> 触发生成 -> 获取项目结果”展开。

## POST /projects

创建项目并保存输入文档。

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
- `content` 必填，原始文档内容
- `sourceType` 可选，当前支持 `markdown`、`txt`、`html`

当前约定：

- `markdown` / `txt` / `html` 直接传文本内容

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
    "outputFile": "/abs/path/data/projects/rag-demo-20260421-ab12cd/output/presentation.pptx"
  }
}
```

## POST /projects/:projectId/generate

执行当前第二版主流程，生成解析结果、分析结果、大纲、视觉规划、逐页内容、多轮 refinement 结果和最终输出文件。

请求：

```json
{
  "requestedSlides": 6,
  "refinementRounds": 2
}
```

字段：

- `requestedSlides` 可选，期望页数
- `refinementRounds` 可选，1 到 3 轮 refinement

响应示例：

```json
{
  "success": true,
  "data": {
    "projectId": "rag-demo-20260421-ab12cd",
    "title": "RAG Engineering",
    "deckPlan": {
      "title": "RAG Engineering",
      "totalSlides": 6,
      "slides": []
    },
    "visualPlan": {
      "theme": "editorial-soft",
      "slides": []
    },
    "slideSpecs": [],
    "iterations": [
      {
        "round": 1,
        "objective": "Build a coherent presentation storyline.",
        "slideSpecs": []
      }
    ],
    "outputFile": "/abs/path/data/projects/rag-demo-20260421-ab12cd/output/presentation.pptx"
  }
}
```

说明：

- 当前 `visualPlan` 已经包含更细的设计决策字段
- 主链路里稳定输出的 `visualTechnique` 以 `none / image / svg` 为主
- `mermaid / table / code-block / formula` 目前仍属于待接入能力

## 生成结果目录

每次生成都会把输入、中间产物和输出文件写到：

```txt
data/projects/<projectId>/
```

目录中的关键文件包括：

- `input.*`
- `project.json`
- `parsed-document.json`
- `content-analysis.json`
- `deck-plan.json`
- `visual-plan.json`
- `slide-specs.json`
- `iterations/round-xx/*`
- `assets/*`
- `output/presentation.pptx`

## 错误响应

当前项目没有单独包装复杂错误协议，NestJS 默认会返回标准 HTTP 错误响应。

最常见的是：

- `404` 项目不存在
- `400` 请求体格式错误
- `500` 服务端执行失败
