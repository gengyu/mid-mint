# 主题自适应视觉系统

## 目标

构建一个“主题自适应但受约束”的视觉系统，让不同内容主题在预览中有明显差异，同时保持结果可解释、可路由、可渲染。

## 方向约束

* 不把模型微调作为第一优先解
* 不允许模型为每个任务自由生成像素级布局
* 不新增工作流阶段，视觉路由仍由 `visual-match` 负责
* 让模型理解内容并输出结构化视觉信号
* 由模板系统保证最终布局稳定性与可渲染性

## 三层视觉体系

### 第一层: 内容信号理解

至少推导：

* `themeCategory`
* `tone`
* `densityLevel`
* `contentIntent`
* `audienceMode`

### 第二层: Deck 级视觉路线

系统必须先为整套 Deck 选择唯一的 `VisualFamily`，再进入逐页模板选择。

### 第三层: Slide 级模板路由

每页模板必须结合以下因素解析：

* `pageType`
* `themeCategory`
* `VisualFamily`
* `densityLevel`
* slot 约束
* overflow 风险

## 模板元数据要求

每个模板必须暴露：

```ts
type TemplateRouteMeta = {
  supportedPageTypes: DeckPageType[];
  supportedFamilies: VisualFamily[];
  supportedThemes: ThemeCategory[];
  densitySupport: DensityLevel[];
  emphasis: "low" | "medium" | "high";
  usagePriority: number;
  phase1Status: "enabled" | "excluded";
};
```

## VisualSpec 输出要求

必须至少包含：

* `routeId`
* `themeCategory`
* `visualFamily`
* `tone`
* `densityLevel`
* `layoutMode`
* `paletteKey`
* `typographyMode`
* `decorationLevel`
* `imageStrategy`
* `routeReasons`
* `warnings`
