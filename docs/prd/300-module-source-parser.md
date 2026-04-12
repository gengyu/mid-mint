# 模块规范: source-parser

## 目标

将混合输入源转换为有效的 `ParsedSource`。

## 输入

* `SourceInput`
* 可选的 URL 抓取补充内容

## 输出

* `ParsedSource`

## LLM 责任

* 生成简洁标题
* 生成一段式摘要
* 提取关键事实
* 归一化关键观点
* 提取直接引用
* 识别事实风险

## 确定性责任

* 校验输入
* URL 去重
* 限制列表长度
* 校验最终输出
* 必要时执行 fallback

## 规则

* 必须支持 `rawText`、`notes` 和 URLs
* `summary` 不可为空
* `keyFacts` 必须是具体事实
* `keyPoints` 必须适合下游直接消费
* 无法提取发布时间时返回 `null`

## 错误码

* `SOURCE_INPUT_EMPTY`
* `SOURCE_PARSE_NO_USABLE_CONTENT`
* `PARSED_SOURCE_SUMMARY_EMPTY`
* `PARSED_SOURCE_KEY_FACTS_EMPTY`
* `PARSED_SOURCE_KEY_POINTS_EMPTY`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`
