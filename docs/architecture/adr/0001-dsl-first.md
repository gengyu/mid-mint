# ADR 0001: DSL-first PPT Generation

## Status

Accepted

## Context

旧流程围绕多个中间产物串联：

- deck plan
- design plan
- layout plan
- visual plan
- slide specs

这些产物能帮助调试，但长期会让 renderer 不知道应该以哪个协议为准，也容易把项目带回模板增强路线。

## Decision

第四版采用 `ppt-dsl.json` 作为唯一主协议。

主流程：

```txt
Document
  -> Parse
  -> Analyze
  -> Generate PPT DSL
  -> Refine PPT DSL
  -> Generate Assets From DSL
  -> Render From DSL
```

## Consequences

- renderer 只解释 DSL
- assets 只从 DSL elements 生成
- 旧 plan 主产物不再生成
- 多轮 refinement 修改同一份 DSL
- 主题、布局、元素、约束都沉淀在一个协议里

## Rejected Alternatives

- 继续扩展固定模板
- 保留多个 plan 作为长期主协议
- 让 renderer 自己猜页面结构和视觉策略
