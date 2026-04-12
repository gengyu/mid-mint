# 模块规范: visual-match

## 目标

完成主题视觉识别、整套 Deck 的视觉路线选择和每页模板映射。

## 输入

* `ParsedSource`
* `ContentBrief`
* `DeckPlan`
* `preferredStyle`
* 模板元数据

## 输出

* 更新后的 `DeckPlan`
* `VisualSpec`

## LLM 责任

* 分类 `themeCategory`
* 分类 `tone`
* 分类 `densityLevel`
* 分类 `contentIntent`
* 分类 `audienceMode`
* 生成结构化路由理由候选

## 确定性责任

* 选择唯一 Deck 级 `VisualFamily`
* 为每页解析最终 `templateId`
* 执行模板兼容性校验
* 执行 tie-break 与 fallback
* 生成稳定 `routeReasons` 与 `warnings`

## 规则

* 相同结构化输入和相同模板目录版本下，最终路由必须保持确定性
* 模型分类结果不能绕过模板约束
* 不允许模型直接选择被排除的模板
* 路由原因必须是稳定代码集合

## 错误码

* `VISUAL_INPUT_INVALID`
* `VISUAL_TEMPLATE_NOT_FOUND`
* `VISUAL_SIGNAL_INVALID`
* `VISUAL_TEMPLATE_META_INVALID`
* `VISUAL_ROUTE_UNRESOLVED`
* `VISUAL_SPEC_INVALID`
* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`
