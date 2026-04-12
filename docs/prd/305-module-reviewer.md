# 模块规范: reviewer

## 目标

生成结构化 `ReviewResult`，评估内容质量、视觉契合度与是否需要重写。

## 输入

* `ParsedSource`
* `ContentBrief`
* `DeckPlan`
* `VisualSpec`
* `RenderResult`

## 输出

* `ReviewResult`

## LLM 责任

* 评估封面吸引力
* 评估页间重复度
* 评估信息密度是否过载
* 评估视觉路线与内容是否匹配
* 评估事实风险
* 评估表达是否通用、是否有“搬运感”

## 确定性责任

* 校验总分范围为 0 到 100
* 校验分项分数范围为 0 到 100
* 执行固定决策阈值
* 校验 `decision` 与 `rewriteStage` 一致性

## 决策阈值

* `approve` 当 `score >= 80` 且 `blockingIssues.length = 0`
* `rewrite` 当 `score >= 50` 且 `score < 80` 且 `blockingIssues.length = 0`
* `block` 当 `score < 50` 或 `blockingIssues.length > 0`

## 错误码

* `REVIEW_INPUT_INVALID`
* `REVIEW_SCORE_INVALID`
* `REVIEW_DECISION_INVALID`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`
