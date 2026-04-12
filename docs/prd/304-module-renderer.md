# 模块规范: renderer

## 目标

把 `DeckPlan` 与 `VisualSpec` 渲染为可导出的正式资产。

## 输入

* `DeckPlan`
* `VisualSpec`
* 模板定义

## 输出

* `RenderResult`

## 规则

* 每页必须产出一组渲染资产
* 每页都必须输出 PNG 与 SVG
* 每个版本必须输出一个 HTML 预览地址
* 必须在页级别检测溢出
* 不允许静默丢弃内容
* 存在溢出时必须设置 `overflowDetected = true`
* 资产数必须与 slide 数一致

## 错误码

* `RENDER_INPUT_INVALID`
* `RENDER_TEMPLATE_MISSING`
* `RENDER_ASSET_COUNT_INVALID`
* `RENDER_PNG_MISSING`
* `RENDER_SVG_MISSING`
* `RENDER_HTML_PREVIEW_MISSING`
