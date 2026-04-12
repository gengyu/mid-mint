# mid-mint PRD 总览

## 文档定位

本目录为 `mid-mint` 的最新中文 PRD 文档集，是当前实现阶段唯一有效的产品与技术契约来源。

本次重构目标：

* 用一套拆分后的中文文档替换旧的 `prd` 与 `prd-v2`
* 合并 v1 的阶段化架构约束与 v2 的 LLM 集成能力
* 避免“基础规范”和“增量规范”并存导致的规则分叉

## 产品目标

`mid-mint` 是一个分阶段内容生成系统，用于把用户提供的 URL、长文本、笔记、目标受众、内容目标与风格偏好，转换为适合小红书图文卡片的 4 至 5 页内容 Deck，并产出可评审、可预览、可导出的素材。

核心流程：

```text
SourceInput
-> source-parser
-> brief-generator
-> deck-generator
-> visual-match
-> renderer
-> reviewer
-> approve 或 rewrite
```

## 文档索引

* [050-architecture.md](/Users/gengyu/code/mid-mint/docs/prd/050-architecture.md)
* [100-domain-model.md](/Users/gengyu/code/mid-mint/docs/prd/100-domain-model.md)
* [150-llm-integration-spec.md](/Users/gengyu/code/mid-mint/docs/prd/150-llm-integration-spec.md)
* [200-workflow-spec.md](/Users/gengyu/code/mid-mint/docs/prd/200-workflow-spec.md)
* [300-module-source-parser.md](/Users/gengyu/code/mid-mint/docs/prd/300-module-source-parser.md)
* [301-module-brief-generator.md](/Users/gengyu/code/mid-mint/docs/prd/301-module-brief-generator.md)
* [302-module-deck-generator.md](/Users/gengyu/code/mid-mint/docs/prd/302-module-deck-generator.md)
* [303-module-visual-match.md](/Users/gengyu/code/mid-mint/docs/prd/303-module-visual-match.md)
* [304-module-renderer.md](/Users/gengyu/code/mid-mint/docs/prd/304-module-renderer.md)
* [305-module-reviewer.md](/Users/gengyu/code/mid-mint/docs/prd/305-module-reviewer.md)
* [306-theme-adaptive-visual-system.md](/Users/gengyu/code/mid-mint/docs/prd/306-theme-adaptive-visual-system.md)
* [400-api-spec.md](/Users/gengyu/code/mid-mint/docs/prd/400-api-spec.md)
* [500-storage-spec.md](/Users/gengyu/code/mid-mint/docs/prd/500-storage-spec.md)
* [600-frontend-spec.md](/Users/gengyu/code/mid-mint/docs/prd/600-frontend-spec.md)
* [700-task-breakdown.md](/Users/gengyu/code/mid-mint/docs/prd/700-task-breakdown.md)

## 总体原则

* 必须使用固定阶段流水线，不能退化为一次黑盒 Agent 调用
* 每个阶段必须具备类型化输入、输出、校验、持久化与阶段日志
* 编排器只负责调度，不负责内容生成
* LLM 只能生成结构化候选结果，不能绕过 schema 校验
* 渲染与导出必须保持确定性
* 历史版本不可被覆盖
