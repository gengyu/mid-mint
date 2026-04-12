# 模块规范: brief-generator

## 目标

根据 `ParsedSource`、目标受众、内容目标和风格偏好，生成 `ContentBrief`。

## 输入

* `ParsedSource`
* `targetAudience`
* `contentGoal`
* `preferredStyle`

## 输出

* `ContentBrief`

## LLM 责任

* 选择唯一 `angle`
* 按目标受众重写叙事方向
* 生成更具体的 takeaway
* 提取必须保留的关键信息
* 给出需要避免的表达

## 确定性责任

* 校验上游结果
* 校验枚举合法性
* 校验 takeaway 数量
* 校验最终结构

## 规则

* `narrative` 必须是一段
* `keyTakeaways` 必须为 3 到 5 条
* `mustInclude` 必须保留上游关键事实
* `avoid` 必须足够具体

## 错误码

* `BRIEF_INPUT_INVALID`
* `BRIEF_TOPIC_EMPTY`
* `BRIEF_AUDIENCE_EMPTY`
* `BRIEF_NARRATIVE_EMPTY`
* `BRIEF_KEY_TAKEAWAYS_INVALID`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`
