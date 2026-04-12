# mid-mint 前端规范

## 必需页面

* 任务创建页
* 任务工作台
* 预览页
* 导出面板

## 工作台必须支持

* 查看任务摘要与当前状态
* 查看阶段进度与版本列表
* 查看各阶段结构化结果
* 查看视觉路线摘要
* 查看每页模板选择结果
* 查看评审分数、问题与建议
* 在允许时发起重写
* 展示 `stageMeta` 中的模型与 fallback 信息

## 预览页必须支持

* 展示每页 PNG 预览
* 展示整套 Deck 的 `visualFamily`
* 展示每页的 `templateId`
* 展示 overflow 告警
* 展示 HTML 预览链接

## 阶段一约束

* 只读展示视觉路由与模板选择
* 不实现 route override
* 不实现 per-slide template override
