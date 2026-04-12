# mid-mint 存储规范

## 必需逻辑表

* `jobs`
* `job_versions`
* `source_inputs`
* `parsed_sources`
* `content_briefs`
* `deck_plans`
* `visual_specs`
* `render_results`
* `review_results`
* `stage_logs`
* `rewrite_logs`

## 核心要求

* 所有阶段产物必须按 `job_id + version_number` 保存
* 历史版本必须可查询且不可变
* `stage_logs` 必须记录开始、结束、状态、错误码和错误信息
* LLM 驱动阶段日志还应记录模型、重试、fallback 和耗时

## 错误模型

```ts
type AppError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};
```
