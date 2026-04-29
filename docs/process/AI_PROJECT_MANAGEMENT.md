# AI_PROJECT_MANAGEMENT.md

## 目标

本文定义 Mid-mint 的 AI 项目文档和需求管理方式。

核心原则：

```txt
Docs are the source of truth.
Code follows specs.
Tasks follow acceptance criteria.
```

## 调研结论

当前主流 AI 编程项目越来越接近 `Spec-Driven Development`。

关键做法：

- 先写需求和约束，再让 AI 写代码
- 把需求、设计、任务、验收标准拆成独立文档
- 每个任务必须有清晰完成定义
- 用 `AGENTS.md` 或类似文件告诉 AI 如何工作
- 把长期上下文沉淀到仓库，而不是依赖聊天记录
- 保留 ADR，记录关键架构决策和为什么这么做
- 任务要小、可验证、可回滚

参考来源：

- GitHub Spec Kit：强调 Spec-Driven Development，把 specification 作为可执行输入，而不是一次性脚手架。
- AGENTS.md：把 AI agent 需要的项目上下文、命令、约定放在仓库里的固定入口。
- OpenAI Codex 说明：强调通过 AGENTS.md 提供项目导航、测试命令和工作约定，并用可验证输出支撑任务完成。
- Atlassian AI 项目管理材料：强调明确目标、可见性、反馈循环、持续监控和人工监督。

## 文档结构

当前采用这套结构：

```txt
AGENTS.md
README.md
docs/
├── README.md
├── product/
│   ├── V4_DSL_FIRST_PLAN.md
│   └── TASKS.md
├── architecture/
│   ├── PPT_DSL.md
│   └── adr/
│       └── 0001-dsl-first.md
├── reference/
│   └── FILE_CONTRACTS.md
├── process/
│   └── AI_PROJECT_MANAGEMENT.md
└── archive/
    └── V3_REQUIREMENTS_ARCHIVE.md
```

## 每个文档的职责

### AGENTS.md

AI 工作入口。

用途：

- 定义当前版本目标
- 定义架构边界
- 定义禁止事项
- 定义阅读顺序
- 给 AI 编程工具提供稳定上下文

### README.md

项目入口。

用途：

- 给人快速了解项目
- 维护当前 API 说明
- 说明如何运行和验证

### product/V4_DSL_FIRST_PLAN.md

版本级 PRD。

用途：

- 描述第四版为什么存在
- 定义核心目标和非目标
- 定义主流程和验收标准

### product/TASKS.md

任务级需求管理。

用途：

- 保存下一步任务队列
- 每个任务包含目标、范围、验收标准
- 防止需求只存在于聊天记录

### reference/FILE_CONTRACTS.md

产物契约。

用途：

- 定义项目目录结构
- 定义每个 JSON / PPTX / SVG 的职责
- 让 AI 和人工都能检查生成结果

### architecture/PPT_DSL.md

核心协议文档。

用途：

- 定义 `ppt-dsl.json`
- 定义 DSL 的扩展方式
- 约束 renderer 和 LLM 的输入输出

### architecture/adr/

架构决策记录。

用途：

- 记录重大架构决策
- 记录为什么接受某方案
- 记录被拒绝的替代方案

### archive/

历史归档。

用途：

- 保存旧版本需求
- 防止历史讨论污染当前版本
- 记录为什么放弃某些方向

## 需求流转

新需求进入项目时，按这个顺序处理：

```txt
Idea
  -> product/TASKS.md
  -> Acceptance Criteria
  -> Code Change
  -> Verification
  -> Update Docs
```

如果需求影响架构：

```txt
Idea
  -> product/V4_DSL_FIRST_PLAN.md
  -> architecture/PPT_DSL.md or reference/FILE_CONTRACTS.md
  -> product/TASKS.md
  -> Code
```

## 任务模板

```md
### T*: Task Name

状态：todo | doing | done

目标：

- ...

范围：

- ...

验收：

- `pnpm build` 通过
- 相关 smoke 通过
- 产物符合 reference/FILE_CONTRACTS.md
```

## 架构决策记录

重大决策必须写入文档，至少包含：

- 决策是什么
- 为什么这么做
- 放弃了什么方案
- 对代码和产物有什么影响

当前重要决策：

- 第四版采用 DSL-first
- 不再使用固定模板主链路
- 不再生成旧 plan 主产物
- 不使用真实图片链路
- 未配置 LLM 时拒绝生成

## AI 执行规范

AI 修改代码前应先确认：

- 当前任务是否在 `product/TASKS.md`
- 是否影响 `architecture/PPT_DSL.md`
- 是否影响 `reference/FILE_CONTRACTS.md`
- 是否需要更新 `README.md`

AI 完成任务后必须汇报：

- 修改了哪些文件
- 为什么这么改
- 如何运行
- 如何验证
- 还有哪些 TODO
