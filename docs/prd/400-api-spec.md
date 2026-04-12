# mid-mint API 规范

## 兼容性原则

API 保持 v1 的基础形状，但必须吸收 v2 的阶段元数据能力。

## 核心接口

* `POST /jobs`
* `POST /jobs/:jobId/run`
* `GET /jobs/:jobId`
* `GET /jobs/:jobId/versions/:version`
* `POST /jobs/:jobId/rewrite`
* `GET /jobs/:jobId/preview`
* `POST /jobs/:jobId/export`

## 版本详情扩展

`GET /jobs/:jobId/versions/:version` 必须返回完整阶段结果，并应额外包含 `stageMeta[]`。

`stageMeta[]` 至少包括：

* `stageName`
* `usedLlm`
* `model`
* `usedFallback`
* `durationMs`
* `errorCode`

## 导出格式

允许导出：

* `png`
* `svg`
* `html`

## 重写接口约束

* `targetStage` 必须属于允许的重写阶段
* 仅当任务处于 `REVIEWED`、`REWRITE_PENDING` 或 `FAILED` 时允许请求
* 当 `rewriteCount >= 3` 时必须失败
