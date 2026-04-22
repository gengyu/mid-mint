# TASKS.md

## 当前任务状态

本项目已经从“完整版产品规划”收缩为“最小可跑通 MVP”。

当前任务只围绕首版主链路展开，不再维护旧版的完整产品任务表。

## 第一阶段目标

完成以下闭环：

1. 创建项目
2. 保存 `Markdown / Txt` 输入
3. 生成 `parsed-document.json`
4. 生成 `content-analysis.json`
5. 生成 `deck-plan.json`
6. 生成 `slide-specs.json`
7. 生成少量 SVG 或 Mermaid 图示
8. 生成可打开的 `.pptx`

## 第一阶段任务清单

### P0 核心任务

- [ ] 补齐 NestJS 最小启动入口
- [ ] 实现 `POST /projects`
- [ ] 实现 `GET /projects`
- [ ] 实现 `GET /projects/:id`
- [ ] 实现 `POST /projects/:id/generate`
- [ ] 实现项目目录与文件存储
- [ ] 实现 Markdown/Txt 解析
- [ ] 实现 LLM 结构化输出
- [ ] 实现 Deck Plan 生成
- [ ] 实现 Slide Specs 生成
- [ ] 实现简单图示生成
- [ ] 实现 PPTX 导出

### P1 补充任务

- [ ] 增加 Docx 支持
- [x] 用 `marked` 替换简化解析逻辑
- [ ] 引入 Mermaid 图示链路
- [x] 增加最小 smoke 脚本
- [ ] 增加示例输入文件

### P2 后续任务

- [ ] 视情况引入 SQLite 元数据存储
- [ ] 支持更多布局模板
- [ ] 支持更多图示类型
- [ ] 支持更稳定的结构化输出重试

## 明确暂缓

以下内容不进入当前阶段：

- 单元测试 / E2E / eslint / prettier 整理
- BullMQ / Redis / 队列
- TypeORM / PostgreSQL
- Reviewer / Auto-fix
- Export 独立模块
- 鉴权 / 权限系统
- Docker / CI/CD / 监控
- PDF / Notion / Confluence 导入
- 在线编辑与预览

## 当前验收标准

满足下面 4 条即可认为第一阶段完成：

1. 能通过接口创建项目并保存输入文案
2. 能生成 JSON 中间产物
3. 能输出一个可打开的 `.pptx`
4. 整个流程不依赖 Redis、外部数据库或复杂基础设施
