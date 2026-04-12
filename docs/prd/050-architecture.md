# mid-mint 整体架构

## 架构目标

系统必须在“显式阶段 + 可追踪版本 + LLM 提升内容质量”的前提下，完成从源材料到小红书图文 Deck 的生成闭环。

## 整体架构图

```mermaid
flowchart TD
    A["用户输入<br/>URLs / Raw Text / Notes / Audience / Goal / Style"] --> B["API 层<br/>创建任务 / 运行任务 / 查询版本 / 重写 / 导出"]
    B --> C["工作流编排器<br/>固定阶段调度 / 状态推进 / 重写控制 / 版本管理"]

    C --> D["source-parser<br/>LLM 提取 + 校验"]
    D --> E["brief-generator<br/>LLM 规划 + 校验"]
    E --> F["deck-generator<br/>LLM 生成结构 + 校验"]
    F --> G["visual-match<br/>LLM 分类 + 确定性模板路由"]
    G --> H["renderer<br/>模板渲染 PNG / SVG / HTML"]
    H --> I["reviewer<br/>LLM 评审 + 阈值决策"]

    I --> J{"评审结果"}
    J -->|"approve"| K["APPROVED"]
    J -->|"rewrite"| L["REWRITE_PENDING<br/>创建新版本并重跑目标阶段及下游"]
    J -->|"block"| M["FAILED 或人工处理"]
    L --> C

    C -.读写.-> N["存储层<br/>jobs / job_versions / stage artifacts / stage_logs / rewrite_logs"]
    G -.读取.-> O["模板元数据<br/>TemplateRouteMeta"]
    H -.读取.-> P["模板资产与渲染定义"]
    B --> Q["前端工作台<br/>任务详情 / 阶段结果 / 预览 / 导出"]
    N --> Q
    H --> Q
```

## 分层职责

* API 层负责创建任务、触发运行、查询版本、重写和导出
* 编排层负责固定顺序调度、状态推进、版本管理和失败停止
* 内容生成层负责结构化解析、brief、deck、视觉分类和评审
* 渲染层负责模板渲染和导出资产生成
* 存储层负责任务、版本、阶段产物和审计日志

## 架构约束

* 不允许新增独立 LLM 工作流阶段
* 不允许由模型直接生成正式渲染资产
* 不允许跳过中间阶段直接生成最终结果
* 不允许后续版本覆盖历史版本数据
