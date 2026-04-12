# mid-mint LLM 集成规范

## 目标

在不破坏显式阶段架构的前提下，使用 LLM 提升内容理解、文案生成、视觉分类与评审质量。

## 通用执行模式

```text
类型化阶段输入
-> Prompt 组装
-> LLM 调用
-> 结构化 JSON 输出
-> Schema 校验
-> 确定性修复或 fallback
-> 持久化最终有效结果
```

## LLM 可以做什么

* 从噪声源材料中提取结构化内容
* 生成更适合小红书表达的 brief
* 生成更有吸引力但仍受约束的 Deck 文案
* 分类视觉信号
* 评估内容质量与视觉匹配度

## LLM 不可以做什么

* 绕过 schema 校验
* 直接写入存储
* 改变工作流顺序
* 修改历史版本结果
* 直接产出正式 PNG 或 SVG

## 能力要求

系统必须支持：

* 每阶段结构化 JSON 输出
* 每阶段超时
* 每阶段重试
* 每阶段 fallback
* 每阶段模型名记录
* 模型输出无效时的类型化错误映射

## 必需错误码

* `LLM_REQUEST_FAILED`
* `LLM_TIMEOUT`
* `LLM_OUTPUT_EMPTY`
* `LLM_OUTPUT_PARSE_FAILED`
* `LLM_OUTPUT_SCHEMA_INVALID`
* `LLM_FALLBACK_EXHAUSTED`

## 阶段日志要求

所有 LLM 驱动阶段日志必须记录：

* `stageName`
* `model`
* `usedLlm`
* `retryCount`
* `usedFallback`
* `errorCode`
* `durationMs`
