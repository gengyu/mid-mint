# Mid-mint

一个本地优先的 AI PPT 生成服务。

当前项目按照第一版目标推进，不再以 MVP 口径描述。

第一版聚焦一条完整且可持续迭代的主链路：输入文档，生成结构化中间产物，规划演示内容与视觉表达，最终导出 `.pptx`。

## 第一版目标

- 支持 `Markdown / Docx / Txt / HTML`
- 解析文档结构
- 通过 LLM 分析内容
- 生成 Deck 大纲
- 规划视觉呈现
- 生成逐页内容
- 渲染并导出 `.pptx`
- 将输入、产物和输出文件完整保存到项目目录

## 第一版主流程

```txt
Document
  -> Parse
  -> Analyze
  -> Plan
  -> Visuals
  -> Slides
  -> Render
```

## 当前接口

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/generate`

更具体的请求和响应见 [docs/API.md](/Users/gengyu/code/mid-mint/docs/API.md:1)。

## 项目结构

```txt
src/
├── main.ts
├── app.module.ts
├── common/
├── config/
└── modules/
    ├── projects/
    ├── pipeline/
    ├── parser/
    ├── llm/
    ├── visuals/
    ├── slides/
    ├── renderer/
    └── storage/
```

## 输出目录

所有项目产物写到：

```txt
data/projects/<projectId>/
├── input.*
├── project.json
├── parsed-document.json
├── content-analysis.json
├── deck-plan.json
├── visual-plan.json
├── slide-specs.json
├── assets/
└── output/
```

## 快速开始

安装依赖：

```bash
pnpm install
```

构建：

```bash
pnpm build
```

开发启动：

```bash
pnpm dev
```

生产启动：

```bash
pnpm start:prod
```

## 示例输入

示例文案见 [examples/sample.md](/Users/gengyu/code/mid-mint/examples/sample.md:1)。

如果当前环境不方便监听 HTTP 端口，也可以直接在 Node 进程里调用 `ProjectsService`：

```bash
node - <<'JS'
const { readFile } = require('node:fs/promises');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { ProjectsService } = require('./dist/modules/projects/projects.service');

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const projectsService = app.get(ProjectsService);
    const content = await readFile('./examples/sample.md', 'utf-8');
    const project = await projectsService.createProject({
      title: 'sample-demo',
      content,
      sourceType: 'markdown',
    });
    const result = await projectsService.generate(project.id, { requestedSlides: 5 });
    console.log(project.id);
    console.log(result.outputFile);
  } finally {
    await app.close();
  }
})();
JS
```

## 推荐阅读顺序

如果你是新加入项目的开发者或 AI 工具，建议先看：

1. [AGENTS.md](/Users/gengyu/code/mid-mint/AGENTS.md:1)
2. [docs/V1.md](/Users/gengyu/code/mid-mint/docs/V1.md:1)
3. [docs/IMPLEMENTATION_PLAN.md](/Users/gengyu/code/mid-mint/docs/IMPLEMENTATION_PLAN.md:1)
4. [docs/FILE_CONTRACTS.md](/Users/gengyu/code/mid-mint/docs/FILE_CONTRACTS.md:1)
5. [docs/API.md](/Users/gengyu/code/mid-mint/docs/API.md:1)
6. [examples/sample.md](/Users/gengyu/code/mid-mint/examples/sample.md:1)

## 文档分工

- `AGENTS.md`
  放 AI 协作约束、架构边界、开发顺序、工作方式
- `README.md`
  放项目介绍、第一版目标、主流程、运行方式、上手入口
- `docs/V1.md`
  放第一版范围、原则和验收标准
