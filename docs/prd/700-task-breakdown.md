# mid-mint 任务拆解

## 阶段 0: 基础契约

* 完成领域模型与 schema
* 完成工作流状态
* 完成 API 基础结构
* 完成存储结构

## 阶段 1: 编排器与版本

* 实现任务创建与版本初始化
* 实现固定阶段编排器
* 实现阶段状态推进
* 实现阶段日志记录

## 阶段 2: 核心模块

* 实现 `source-parser`
* 实现 `brief-generator`
* 实现 `deck-generator`
* 实现 `visual-match`
* 实现 `renderer`
* 实现 `reviewer`

## 阶段 3: LLM 增强

* 接入 Prompt 组装
* 接入结构化输出解析与 schema 校验
* 实现超时、重试与 fallback
* 落地阶段元数据日志

## 阶段 4: 重写与前端闭环

* 实现局部重写
* 实现版本切换与查看
* 实现任务工作台
* 实现预览页与导出面板
