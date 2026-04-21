# PROMPTS.md

## Prompt 管理说明

本项目的 LLM Prompt 统一管理在此，**禁止在代码中硬编码 Prompt**。

所有 Prompt 应遵循以下规范：

1. **位置：** 放在对应模块的 `prompts/` 目录
2. **格式：** `.prompt.ts` 文件导出字符串模板
3. **Schema：** `.schema.ts` 文件定义 Zod schema
4. **版本控制：** 重要修改需记录变更原因

---

## 现有 Prompts

### 1. 内容分析 Prompt

**位置：** `src/modules/analyzer/prompts/content-analysis.prompt.ts`  
**Schema：** `src/modules/analyzer/prompts/content-analysis.schema.ts`

**用途：** 分析文档内容，提取关键信息

**输入：**
- 文档全文
- 文档结构（标题层级）

**输出：**
```json
{
  "mainTopic": "主要主题",
  "keyMessages": [
    {
      "title": "关键信息标题",
      "description": "详细描述",
      "priority": 5
    }
  ],
  "contentType": "technical|business|educational|other",
  "summary": "内容摘要",
  "suggestedTone": "professional|casual|inspirational"
}
```

**Prompt 要点：**
- 不要改写核心观点
- 识别真正的关键信息，而非表面内容
- 优先级 1-5，5 为最重要
- 摘要控制在 200 字以内

---

### 2. Deck 规划 Prompt

**位置：** `src/modules/planner/prompts/deck-plan.prompt.ts`  
**Schema：** `src/modules/planner/prompts/deck-plan.schema.ts`

**用途：** 生成 PPT 大纲

**输入：**
- 内容分析结果
- 目标页数
- 风格偏好

**输出：**
```json
{
  "title": "PPT 标题",
  "subtitle": "副标题",
  "totalSlides": 10,
  "slides": [
    {
      "slideNumber": 1,
      "type": "cover",
      "title": "封面标题",
      "subtitle": "封面副标题",
      "keyPoint": "该页核心观点",
      "section": "所属章节"
    }
  ]
}
```

**Slide 类型：**
- `cover` - 封面
- `toc` - 目录
- `section` - 章节页
- `content` - 内容页
- `summary` - 总结页

**Prompt 要点：**
- 每页只表达一个核心观点
- 内容页不超过总页数的 60%
- 必须有封面和总结页
- 章节分布要均衡
- 避免空泛的标题

---

### 3. Slide 内容生成 Prompt

**位置：** `src/modules/slides/prompts/slide-spec.prompt.ts`  
**Schema：** `src/modules/slides/prompts/slide-spec.schema.ts`

**用途：** 为每页生成详细内容

**输入：**
- PlannedSlide 信息
- 视觉规划
- 内容分析

**输出：**
```json
{
  "slideNumber": 1,
  "type": "content",
  "layout": "title-bullets",
  "title": "页面标题",
  "subtitle": "副标题（可选）",
  "bullets": [
    {
      "text": "要点文本",
      "level": 0
    }
  ],
  "speakerNotes": "演讲者备注",
  "assets": [
    {
      "type": "chart",
      "placeholder": "chart-1",
      "description": "图表描述"
    }
  ]
}
```

**Prompt 要点：**
- 要点数量 3-6 条
- 每条要点简洁明了（不超过 20 字）
- 使用主动语态
- 避免专业术语堆砌
- 演讲者备注提供补充信息

---

### 4. 视觉规划 Prompt

**位置：** `src/modules/visuals/prompts/visual-plan.prompt.ts`

**用途：** 规划每页的视觉呈现

**输入：**
- DeckPlan
- 布局模板列表

**输出：**
```json
{
  "theme": "clean-light",
  "slides": [
    {
      "slideNumber": 1,
      "layout": "cover",
      "colorScheme": "primary",
      "hasChart": false,
      "hasImage": true,
      "chartType": null
    }
  ]
}
```

**可用布局：**
- `cover` - 封面布局
- `title-bullets` - 标题+要点
- `comparison` - 对比布局
- `process` - 流程布局
- `section-divider` - 章节分隔
- `summary` - 总结布局
- `text-visual` - 图文混排

**Prompt 要点：**
- 根据内容类型选择布局
- 数据对比用 `comparison`
- 流程说明用 `process`
- 重要概念用 `text-visual`
- 保持视觉多样性

---

### 5. 质量审查 Prompt

**位置：** `src/modules/reviewer/prompts/review.prompt.ts`  
**Schema：** `src/modules/reviewer/prompts/review.schema.ts`

**用途：** 审查生成的 PPT 内容

**输入：**
- SlideSpec[]

**输出：**
```json
{
  "passed": true,
  "issues": [
    {
      "slideNumber": 3,
      "severity": "warning",
      "message": "要点数量过多，建议精简到 5 条以内"
    }
  ],
  "suggestions": [
    "第 5 页和第 7 页内容重复，建议合并"
  ]
}
```

**检查项：**
- 是否有空标题或空内容
- 要点数量是否合理（3-6 条）
- 文本长度是否适中
- 是否有重复内容
- 逻辑是否连贯

---

## Prompt 编写最佳实践

### ✅ 推荐做法

1. **明确角色设定**
   ```
   你是一位专业的演示文稿设计师，擅长将复杂内容转化为清晰的幻灯片。
   ```

2. **提供具体示例**
   ```
   好的要点示例：
   - "用户增长率达到 150%"
   - "成本降低 30%"
   
   不好的要点示例：
   - "一些数据"
   - "相关内容"
   ```

3. **定义输出格式**
   ```
   请严格按照以下 JSON 格式输出，不要包含其他内容：
   { ... }
   ```

4. **设置约束条件**
   ```
   - 要点数量：3-6 条
   - 每条不超过 20 字
   - 使用主动语态
   ```

5. **说明评估标准**
   ```
   优秀的幻灯片应该：
   - 每页只表达一个核心观点
   - 内容简洁明了
   - 逻辑清晰连贯
   ```

### ❌ 避免的做法

1. **模糊的指令**
   ```
   ❌ "生成一些内容"
   ✅ "生成 3-6 个要点，每个要点不超过 20 字"
   ```

2. **开放式输出**
   ```
   ❌ "你觉得怎么样？"
   ✅ "请按照 JSON 格式输出审查结果"
   ```

3. **过长的 Prompt**
   - 保持 Prompt 简洁
   - 复杂逻辑拆分为多个步骤
   - 使用结构化数据减少冗余

4. **忽略边界情况**
   ```
   ✅ "如果内容不足，生成 '待补充' 占位符"
   ```

---

## Prompt 测试

### 如何测试 Prompt？

1. **准备测试用例**
   - 典型输入
   - 边界输入
   - 异常输入

2. **验证输出格式**
   - JSON 是否可解析
   - 字段是否完整
   - 数据类型是否正确

3. **评估输出质量**
   - 内容是否符合预期
   - 是否满足约束条件
   - 是否需要人工修改

4. **迭代优化**
   - 记录失败的案例
   - 调整 Prompt 措辞
   - 增加示例

---

## Prompt 版本管理

重要的 Prompt 修改应记录：

```markdown
## 变更日志

### v1.2 (2024-01-15)
- 改进 Deck 规划 Prompt，增加章节均衡性要求
- 原因：之前生成的 PPT 章节分布不均

### v1.1 (2024-01-10)
- 优化 Slide 内容生成 Prompt，限制要点数量
- 原因：之前生成的要点过多，影响可读性

### v1.0 (2024-01-01)
- 初始版本
```

---

## 本地模型调优

如果使用 Ollama 或 LM Studio 等本地模型：

1. **选择合适的模型**
   - 推荐：Llama 3.1 8B/70B, Qwen 2.5 7B/72B
   - 需要支持 JSON 输出

2. **调整温度参数**
   - 创造性任务：temperature = 0.7-0.9
   - 结构化任务：temperature = 0.2-0.5

3. **设置系统提示**
   ```
   你是一个专业的助手，请严格按照要求的格式输出。
   只输出 JSON，不要包含其他内容。
   ```

4. **测试不同模型**
   - 比较输出质量
   - 比较响应速度
   - 选择性价比最高的方案
