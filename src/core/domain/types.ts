// Job 在主流程中的阶段状态。
// 这些状态同时用于前端展示、后端编排和阶段日志归档。
export type JobStatus =
  | "INPUT_RECEIVED"
  | "PARSED"
  | "BRIEFED"
  | "DECK_GENERATED"
  | "VISUAL_MATCHED"
  | "RENDERED"
  | "REVIEWED"
  | "APPROVED"
  | "REWRITE_PENDING"
  | "FAILED";

// 允许用户发起 rewrite 的起始阶段。
// 一旦指定某个阶段，系统会复用它之前的产物，并重跑该阶段及下游阶段。
export type RewriteStage =
  | "source-parse"
  | "brief"
  | "deck"
  | "visual";

// deck 中单页的语义类型，用于约束模板匹配与渲染方式。
export type DeckPageType =
  | "cover"
  | "summary"
  | "detail"
  | "comparison"
  | "checklist"
  | "cta";

// 内容切入角度，决定 brief 和 deck 的叙事方式。
export type ContentAngle =
  | "quick_view"
  | "key_points"
  | "industry_impact"
  | "practitioner_view"
  | "product_opportunity"
  | "tool_summary"
  | "pitfall_alert"
  | "experience_breakdown"
  | "method_summary";

// 内容密度等级，影响排版紧凑度和信息量。
export type DensityLevel = "low" | "medium" | "high";

// 内容主题分类，用于视觉路由和模板选择。
export type ThemeCategory =
  | "news_flash"
  | "knowledge_explainer"
  | "comparison_analysis"
  | "case_story"
  | "method_guide"
  | "campaign_launch";

// 语气模式，影响文案和视觉风格。
export type ToneMode =
  | "professional"
  | "sharp"
  | "warm"
  | "practical"
  | "energetic";

// 内容意图，表示这套内容更偏告知、解释、对比还是转化。
export type ContentIntent =
  | "inform"
  | "explain"
  | "compare"
  | "convince"
  | "convert";

// 目标受众模式，用于帮助视觉和内容模块做路线选择。
export type AudienceMode =
  | "broad_consumer"
  | "operator"
  | "professional"
  | "founder_team";

// 视觉家族，用于定义一组相对稳定的模板与风格路线。
export type VisualFamily =
  | "signal-tech"
  | "clean-method"
  | "proof-compare"
  | "warm-story"
  | "brand-campaign";

// 布局松紧程度。
export type LayoutMode = "airy" | "balanced" | "compact";

// 装饰强度，用来控制视觉元素的丰富程度。
export type DecorationLevel = "low" | "medium" | "high";

// 图片策略，决定页面是否需要图片以及图片类型。
export type ImageStrategy = "none" | "abstract" | "editorial";

// 路由原因码，用于解释为什么视觉模块最终选中了某条路线。
export type RouteReasonCode =
  | "angle_selected_base_route"
  | "preferred_style_hint_applied"
  | "preferred_style_hint_ignored"
  | "audience_mode_broad_consumer"
  | "audience_mode_operator"
  | "audience_mode_professional"
  | "audience_mode_founder_team"
  | "density_low_layout_airy"
  | "density_medium_layout_balanced"
  | "density_high_layout_compact";

// review 的最终决策。
export type ReviewDecision = "approve" | "rewrite" | "block";

// LLM 调用阶段的标准错误码，便于记录日志和分类失败原因。
export type LlmErrorCode =
  | "LLM_REQUEST_FAILED"
  | "LLM_TIMEOUT"
  | "LLM_OUTPUT_EMPTY"
  | "LLM_OUTPUT_PARSE_FAILED"
  | "LLM_OUTPUT_SCHEMA_INVALID"
  | "LLM_FALLBACK_EXHAUSTED";

// 用户创建 job 时提交的原始输入。
// 这是整个工作流的源头数据，会被持久化并贯穿后续各阶段。
export type SourceInput = {
  urls: string[]; // 用户提供的原始链接列表，通常用于补充事实来源。
  rawText: string; // 用户直接粘贴的原始文本，是主要内容输入。
  notes: string; // 用户补充的限制条件、语气要求或上下文说明。
  targetAudience: string; // 目标受众描述，供 brief 和视觉阶段参考。
  contentGoal: string; // 内容目标，例如涨粉、解释、转化或传播。
  preferredStyle: string; // 用户偏好的表达与视觉风格提示。
};

// source-parser 阶段产物。
// 把原始输入清洗成结构化的内容事实与风险信息。
export type ParsedSource = {
  title: string; // 从原始资料中归纳出的主标题或主题名。
  summary: string; // 对输入内容的简要总结，供后续阶段快速理解主题。
  keyFacts: string[]; // 可作为事实依据的关键信息点。
  keyPoints: string[]; // 适合转成内容表达的核心观点列表。
  quotes: string[]; // 可直接引用或改写的原文片段。
  sourceUrls: string[]; // 解析后确认有效的来源链接。
  publishTime: string | null; // 内容发布时间，无法确认时为 null。
  riskFlags: string[]; // 风险提示，例如事实不确定、时效性强或有争议。
};

// brief-generator 阶段产物。
// 定义这次 deck 的叙事主题、角度、受众和写作约束。
export type ContentBrief = {
  topic: string; // 本次内容要聚焦的明确主题。
  angle: ContentAngle; // 内容切入角度，决定叙事方式。
  audience: string; // brief 阶段重写后的受众表述，更贴近内容表达。
  narrative: string; // 整篇 deck 的主叙事线，指导页面编排。
  keyTakeaways: string[]; // 最希望用户看完记住的关键信息。
  mustInclude: string[]; // 生成 deck 时必须覆盖的内容点。
  avoid: string[]; // 需要避免的表达、结论或结构方向。
  contentGoal?: string; // 可选地保留业务目标，供后续阶段补充使用。
};

// deck 中单页的结构化定义。
// 这是视觉匹配和渲染模块直接消费的核心页面单元。
export type DeckSlide = {
  index: number; // 页码，从 1 开始递增。
  pageType: DeckPageType; // 页面语义类型，影响模板选择。
  goal: string; // 当前页想完成的表达目标，例如总结、对比或行动召唤。
  title: string; // 页面主标题。
  body: string; // 页面正文内容。
  highlights: string[]; // 需要突出显示的短句、关键词或要点。
  templateId: string; // 当前页绑定的模板标识。
  values: Record<string, string>; // 渲染模板时要注入的结构化字段值。
  charCountTitle: number; // 标题字符数，用于溢出风险估算。
  charCountBody: number; // 正文字符数，用于密度与溢出控制。
};

// deck-generator 阶段产物。
// 表示完整的多页图文结构方案。
export type DeckPlan = {
  summary: string; // 对整套 deck 的结构概览说明。
  slides: DeckSlide[]; // 按顺序排列的页面计划。
  cta: string; // 最终希望用户采取的行动或记住的收束语。
};

// 从内容中提取出的抽象信号。
// 主要供视觉路由和模板选择逻辑使用。
export type ContentSignals = {
  themeCategory: ThemeCategory; // 内容所属主题类别。
  tone: ToneMode; // 内容整体语气。
  densityLevel: DensityLevel; // 内容信息密度评估结果。
  contentIntent: ContentIntent; // 内容想完成的传播目的。
  audienceMode: AudienceMode; // 抽象化后的受众模式。
};

// 模板路由元数据。
// 描述某个模板适合什么页面、主题和视觉家族。
export type TemplateRouteMeta = {
  supportedPageTypes: DeckPageType[]; // 模板可承载的页面类型集合。
  supportedFamilies: VisualFamily[]; // 模板适配的视觉家族。
  supportedThemes: ThemeCategory[]; // 模板适配的主题分类。
  densitySupport: DensityLevel[]; // 模板适合承载的信息密度范围。
  emphasis: DecorationLevel; // 模板本身的装饰感强弱。
  usagePriority: number; // 路由时的优先级，数值越高越优先。
  phase1Status: "enabled" | "excluded"; // 当前阶段是否允许被正式选用。
};

// visual-match 阶段产物。
// 表示当前 deck 对应的完整视觉路线与配置。
export type VisualSpec = {
  routeId: string; // 最终命中的视觉路线标识。
  themeCategory: ThemeCategory; // 与内容匹配后的主题分类。
  visualFamily: VisualFamily; // 选中的视觉家族。
  tone: ToneMode; // 视觉表现应保持的语气。
  densityLevel: DensityLevel; // 视觉上要承接的信息密度。
  layoutMode: LayoutMode; // 页面布局的松紧策略。
  paletteKey: string; // 调色板标识，用于渲染配色。
  typographyMode: string; // 字体与排版风格标识。
  decorationLevel: DecorationLevel; // 装饰元素的丰富程度。
  imageStrategy: ImageStrategy; // 当前路线下的配图策略。
  routeReasons: RouteReasonCode[]; // 路由命中的原因列表，便于解释决策。
  warnings: string[]; // 视觉阶段识别出的风险或提醒。
};

// 单页渲染结果。
// 包含对外可预览的资源地址和版面风险信息。
export type RenderedAsset = {
  slideIndex: number; // 对应的页码。
  pngUrl: string; // 该页 PNG 资源地址。
  svgUrl: string; // 该页 SVG 资源地址。
  htmlFragment: string; // 该页可嵌入预览页的 HTML 片段。
  overflowDetected: boolean; // 是否检测到文本溢出或布局风险。
};

// renderer 阶段产物。
// 汇总整个 deck 的渲染输出地址。
export type RenderResult = {
  assets: RenderedAsset[]; // 每一页的渲染结果详情。
  htmlPreviewUrl: string; // 整套内容的 HTML 预览页地址。
  pngUrls: string[]; // 所有页面 PNG 地址列表。
  svgUrls: string[]; // 所有页面 SVG 地址列表。
};

// review 各维度评分。
// 用于解释最终总分的构成。
export type ReviewStageScores = {
  xiaohongshuFit: number; // 对小红书内容风格的适配程度。
  hookStrength: number; // 标题和开场的吸引力。
  readability: number; // 阅读流畅度和易懂程度。
  densityControl: number; // 信息密度控制是否合适。
  factualSafety: number; // 事实表达的安全性与稳妥性。
  originality: number; // 内容的新鲜感与差异化程度。
  visualFit: number; // 文案与视觉方案的一致性。
};

// reviewer 阶段产物。
// 用于决定当前版本是通过、重写还是阻断。
export type ReviewResult = {
  score: number; // 当前版本的综合评分。
  stageScores: ReviewStageScores; // 各个评价维度的细分分数。
  issues: string[]; // 需要关注的一般问题列表。
  strengths: string[]; // 当前版本表现较好的部分。
  blockingIssues: string[]; // 会阻止通过的严重问题。
  suggestedFixes: string[]; // review 给出的优化建议。
  decision: ReviewDecision; // 最终决策：通过、重写或阻断。
  shouldRewrite: boolean; // 是否建议进入 rewrite 流程。
  rewriteStage: RewriteStage | null; // 若需重写，建议从哪个阶段开始。
};

// job 元数据。
// 表示一个内容生成任务的整体状态，而不是某个具体版本的产物。
export type Job = {
  id: string; // job 唯一标识。
  rewriteCount: number; // 已经发生的 rewrite 次数。
  activeVersion: number; // 当前激活中的版本号。
  createdAt: string; // job 创建时间。
  updatedAt: string; // job 最近一次更新时间。
};

// job 的版本记录。
// 每次初始创建或 rewrite 都会产生一个新的版本号。
export type JobVersion = {
  id: string; // 版本记录自身的唯一标识。
  jobId: string; // 所属 job 的 id。
  versionNumber: number; // 版本号，从 1 开始递增。
  trigger: "initial" | "rewrite"; // 该版本是初始创建还是由 rewrite 产生。
  rewriteStage: RewriteStage | null; // 如果是 rewrite，记录从哪个阶段开始重跑。
  createdAt: string; // 版本创建时间。
};

// 一次 rewrite 请求的业务表达。
export type RewriteRequest = {
  jobId: string; // 要执行 rewrite 的 job。
  targetStage: RewriteStage; // 目标重跑起点阶段。
  reason: string; // 用户填写的重写原因。
};

// 阶段执行元信息。
// 主要用于工作台展示、问题排查和运行审计。
export type StageExecutionMeta = {
  stageName: JobStatus; // 当前记录对应的阶段名。
  usedLlm: boolean; // 最终是否实际使用了 LLM 结果。
  llmAttempted: boolean; // 该阶段是否尝试过调用 LLM。
  model: string | null; // 使用的模型名，未使用时为 null。
  usedFallback: boolean; // 是否走了 fallback 逻辑。
  retryOccurred: boolean; // 是否发生过重试。
  durationMs: number; // 阶段耗时，单位毫秒。
  errorCode: string | null; // 失败时的错误码，成功时为 null。
};
