# mid-mint 工作流规范

## 固定阶段列表

1. `INPUT_RECEIVED`
2. `PARSED`
3. `BRIEFED`
4. `DECK_GENERATED`
5. `VISUAL_MATCHED`
6. `RENDERED`
7. `REVIEWED`
8. `APPROVED`
9. `REWRITE_PENDING`
10. `FAILED`

不允许为 LLM 调用新增额外阶段。

## 主流程

```text
INPUT_RECEIVED
-> PARSED
-> BRIEFED
-> DECK_GENERATED
-> VISUAL_MATCHED
-> RENDERED
-> REVIEWED
-> APPROVED
```

## LLM 驱动阶段执行模型

```text
1. 校验类型化输入
2. 组装 Prompt payload
3. 调用 LLM
4. 解析结构化结果
5. 校验结构化结果
6. 必要时 repair 或 fallback
7. 持久化最终有效输出
8. 更新任务状态
9. 写入阶段日志
```

## 重写规则

允许的重写阶段：

* `source-parse`
* `brief`
* `deck`
* `visual`

规则：

* 每次只能指定一个目标阶段
* 重写时必须重跑目标阶段及所有下游阶段
* 上游阶段结果必须保持不变
* 每次重写必须创建新版本
* 每个任务最多重写 `3` 次

## 停止规则

满足任一条件时必须停止：

* 评审达到批准阈值
* 重写次数达到 3 次
* 检测到阻断性风险
* 连续两次评审提升小于 3 分
* 必需阶段输出无效
* LLM 输出在允许重试和 fallback 后仍无效

## 编排器职责

编排器必须：

* 创建初始版本
* 按顺序调用各阶段
* 校验并持久化每个阶段输出
* 更新任务状态
* 决定停止、批准或重写
* 记录耗时与错误

编排器不得：

* 承担内容生成逻辑
* 直接拼接业务 Prompt
* 覆盖历史版本结果
