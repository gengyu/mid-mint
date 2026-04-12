# 模块规范: deck-generator

## 目标

根据 `ParsedSource` 和 `ContentBrief` 生成可渲染的 `DeckPlan`。

## 输入

* `ParsedSource`
* `ContentBrief`

## 输出

* `DeckPlan`

## LLM 责任

* 生成 4 或 5 页卡片结构
* 为每页定义清晰目标
* 生成更强的封面 hook
* 减少中间页重复
* 保持正文简洁
* 让 CTA 与内容目标一致

## 确定性责任

* 强制页数为 4 或 5
* 强制第一页为 `cover`
* 强制最后一页为 `cta`
* 计算 `charCountTitle`
* 计算 `charCountBody`
* 确保每页存在 `templateId`
* 校验最终结构

## 规则

* `templateId` 在 `visual-match` 前可为临时值
* 中间页不允许浅层改写重复同一观点
* 封面标题必须具备 hook

## 错误码

* `DECK_INPUT_INVALID`
* `DECK_SLIDE_COUNT_INVALID`
* `DECK_COVER_MISSING`
* `DECK_CTA_MISSING`
* `DECK_SLIDE_INDEX_INVALID`
* `DECK_SLIDE_TITLE_EMPTY`
* `DECK_SLIDE_BODY_EMPTY`
* `DECK_TEMPLATE_ID_EMPTY`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`
