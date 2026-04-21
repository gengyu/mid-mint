# Mid-mint

一个本地优先的 AI PPT 生成服务。

当前 MVP 只做一件事：输入一段 `Markdown / Txt` 文案，生成一个 `.pptx`，并把所有中间产物保存到项目目录中。

## 这个项目适合什么

- 想先把“文案 -> PPT”主链路跑通
- 想让 AI 工具更容易接手和持续开发
- 想把中间结果落成 JSON，方便检查和调试

## 当前范围

已覆盖：

- 创建项目
- 保存输入文案
- 解析 `Markdown / Txt`
- 生成 `parsed-document.json`
- 生成 `content-analysis.json`
- 生成 `deck-plan.json`
- 生成 `slide-specs.json`
- 生成少量 SVG 图示素材
- 输出 `.pptx`

明确不做：

- BullMQ / Redis / 异步队列
- TypeORM / PostgreSQL
- Reviewer / Auto-fix
- Export 独立模块
- 在线预览编辑
- 复杂模板系统

## 当前接口

- `POST /projects`
- `GET /projects`
- `GET /projects/:projectId`
- `POST /projects/:projectId/generate`

更具体的请求和响应见 [docs/API.md](/Users/gengyu/code/mid-mint/docs/API.md:1)。

## 主流程

```txt
Create Project
  -> Save Input
  -> Parse Document
  -> Analyze Content
  -> Plan Deck
  -> Write Slides
  -> Generate Assets
  -> Render PPTX
```

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
    ├── slides/
    ├── visuals/
    ├── renderer/
    └── storage/
```

## 输出目录

每次生成都会写到：

```txt
data/projects/<projectId>/
├── input.md | input.txt
├── project.json
├── parsed-document.json
├── content-analysis.json
├── deck-plan.json
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

如果当前环境不方便监听 HTTP 端口，也可以直接在 Node 进程里调用 `ProjectsService` 跑一条例子：

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
2. [docs/MVP.md](/Users/gengyu/code/mid-mint/docs/MVP.md:1)
3. [docs/IMPLEMENTATION_PLAN.md](/Users/gengyu/code/mid-mint/docs/IMPLEMENTATION_PLAN.md:1)
4. [docs/FILE_CONTRACTS.md](/Users/gengyu/code/mid-mint/docs/FILE_CONTRACTS.md:1)
5. [examples/sample.md](/Users/gengyu/code/mid-mint/examples/sample.md:1)

## 现在这两个文件的分工

- `AGENTS.md`
  放 AI 协作约束、代码边界、阅读顺序、工作方式
- `README.md`
  放项目介绍、当前接口、运行方式、输出目录、上手入口
