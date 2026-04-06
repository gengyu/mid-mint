import { z } from "zod";
import { OpenAiProvider } from "@/lib/llm/openai";
import { exportSvg } from "@/lib/renderer/export-svg";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import { createId } from "@/lib/utils/id";
import { MidMintError } from "@/lib/utils/errors";
import { safeJsonParse } from "@/lib/utils/json";
import { stripUnsupportedText, truncateTextSoft } from "@/lib/utils/text";
import { fallbackDeckOutline } from "@/lib/xhs/fallback-deck";
import { saveDeckBundle } from "@/lib/xhs/storage";
import type { XhsDeckRequest, XhsDeckResult, XhsLogEntry, XhsSlide, XhsSlideTemplateId } from "@/lib/xhs/types";

const templateIdSchema = z.enum([
  "cover-hero",
  "feature-compare",
  "step-list",
  "triple-cards",
  "story-split",
  "team-delivery",
  "quote-cta"
]);

const summarySchema = z.object({
  topic: z.string(),
  angle: z.string(),
  audience: z.string(),
  summary: z.string(),
  hook: z.string(),
  keyPoints: z.array(z.string()).min(3).max(6),
  styleHints: z.array(z.string()).min(2).max(5)
});

const planSchema = z.object({
  summary: z.string(),
  slides: z.array(
    z.object({
      templateId: templateIdSchema,
      purpose: z.string(),
      headline: z.string(),
      keyPoint: z.string()
    })
  ).min(4).max(5)
});

const composeSchema = z.object({
  summary: z.string(),
  slides: z.array(
    z.object({
      templateId: templateIdSchema,
      values: z.record(z.string())
    })
  ).min(4).max(5)
});

type SummaryStageOutput = z.infer<typeof summarySchema>;
type PlanStageOutput = z.infer<typeof planSchema>;
type ComposeStageOutput = z.infer<typeof composeSchema>;

const templateVariants = {
  4: [
    ["cover-hero", "step-list", "triple-cards", "quote-cta"],
    ["cover-hero", "feature-compare", "story-split", "quote-cta"],
    ["cover-hero", "step-list", "team-delivery", "quote-cta"]
  ],
  5: [
    ["cover-hero", "step-list", "triple-cards", "story-split", "quote-cta"],
    ["cover-hero", "feature-compare", "triple-cards", "story-split", "quote-cta"],
    ["cover-hero", "step-list", "team-delivery", "feature-compare", "quote-cta"]
  ]
} as const satisfies Record<4 | 5, XhsSlideTemplateId[][]>;

type MaterialPack = {
  topic: string;
  prompt: string;
  sourceText: string;
  keyPoints: string[];
  audience: string;
  intent: string;
};

function normalizeLines(value: string) {
  return stripUnsupportedText(value)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeTopic(request: XhsDeckRequest) {
  const explicit = stripUnsupportedText(request.topic || "");
  if (explicit) {
    return explicit;
  }

  const firstLine = normalizeLines(request.sourceText || "")[0];
  if (firstLine) {
    return truncateTextSoft(firstLine, 28);
  }

  return stripUnsupportedText(request.prompt || "小红书图文主题");
}

function buildMaterialPack(request: XhsDeckRequest): MaterialPack {
  const topic = normalizeTopic(request);
  const cleanedPrompt = stripUnsupportedText(request.prompt || topic);
  const keyPoints = (request.keyPoints || [])
    .map((item) => truncateTextSoft(item, 30))
    .filter(Boolean)
    .slice(0, 6);
  const sourceText = normalizeLines(request.sourceText || "")
    .map((line) => truncateTextSoft(line, 120))
    .join("\n");

  return {
    topic,
    prompt: cleanedPrompt || topic,
    sourceText,
    keyPoints,
    audience: truncateTextSoft(request.audience || "关注 AI 应用与效率提升的人群", 24),
    intent: truncateTextSoft(request.intent || "做成适合小红书发布的多页图文", 24)
  };
}

function pickTemplateVariant(material: MaterialPack, slideCount: number) {
  const variants = templateVariants[slideCount as 4 | 5];
  const topic = material.topic;
  const normalized = `${material.topic} ${material.sourceText} ${material.keyPoints.join(" ")}`.toLowerCase();

  if (/(团队|交付|流程|方法|协作|部署|工具)/.test(topic)) {
    return variants[2] ?? variants[0];
  }

  if (/(案例|对比|变化|vs|副业|变现|故事)/.test(normalized) || /(案例|对比|变化|副业|变现|故事)/.test(topic)) {
    return variants[1] ?? variants[0];
  }

  const seed = Array.from(normalized).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return variants[seed % variants.length];
}

function buildSlotLines(templateIds: XhsSlideTemplateId[]) {
  return templateIds
    .map((templateId) => {
      const template = TEMPLATE_REGISTRY.getById(templateId);
      const slotSpec = template?.slots
        .map((slot) => `${slot.id}(<=${slot.maxLength}字,${slot.maxLines}行)`)
        .join(",");
      return `- ${templateId}: ${slotSpec}`;
    })
    .join("\n");
}

function buildSummaryPrompt(material: MaterialPack) {
  return `
你是一个小红书内容策划。请基于外部提供的素材，先做内容总结。

主题：
${material.topic}

发布目标：
${material.intent}

目标读者：
${material.audience}

素材正文：
${material.sourceText || "未提供正文，请仅根据主题和要点总结。"}

素材要点：
${material.keyPoints.length > 0 ? material.keyPoints.map((item, index) => `${index + 1}. ${item}`).join("\n") : "未提供要点"}

要求：
- 用中文。
- 只提炼外部已提供的信息，不要补充抓取信息。
- angle 要明确这组图文最值得讲的切入角度。
- summary 适合放在预览页顶部。
- hook 是封面主钩子方向，控制在 18 字内。
- keyPoints 输出 3-6 条短句。
- styleHints 输出 2-5 条，描述语气和视觉表达，不要写模板名。

输出格式：
{
  "topic": "主题",
  "angle": "切入角度",
  "audience": "目标读者",
  "summary": "一句总结",
  "hook": "封面钩子",
  "keyPoints": ["要点1", "要点2"],
  "styleHints": ["风格提示1", "风格提示2"]
}

只输出合法 JSON。
  `.trim();
}

function buildPlanPrompt(material: MaterialPack, slideCount: number, summary: SummaryStageOutput, templateIds: XhsSlideTemplateId[]) {
  return `
你是一个小红书图文编排助手。请基于素材总结，为 ${slideCount} 页图文做模板规划。

主题：
${summary.topic}

切入角度：
${summary.angle}

目标读者：
${summary.audience}

封面钩子：
${summary.hook}

内容要点：
${summary.keyPoints.map((item, index) => `${index + 1}. ${item}`).join("\n")}

风格提示：
${summary.styleHints.map((item, index) => `${index + 1}. ${item}`).join("\n")}

你必须严格使用以下模板顺序：
${templateIds.map((item, index) => `${index + 1}. ${item}`).join("\n")}

要求：
- 每页的 purpose 说明这页承担什么作用。
- headline 是这页的主标题方向，12-20 字优先。
- keyPoint 是该页最核心的一句话。
- 不要输出槽位文案，只做规划。

输出格式：
{
  "summary": "整组编排思路",
  "slides": [
    {
      "templateId": "${templateIds[0]}",
      "purpose": "这一页做什么",
      "headline": "标题方向",
      "keyPoint": "核心信息"
    }
  ]
}

只输出合法 JSON。
  `.trim();
}

function buildComposePrompt(material: MaterialPack, summary: SummaryStageOutput, plan: PlanStageOutput) {
  const slotLines = buildSlotLines(plan.slides.map((slide) => slide.templateId));
  return `
你是一个小红书图文写作助手。请把规划稿写成最终模板槽位文案。

主题：
${summary.topic}

切入角度：
${summary.angle}

目标读者：
${summary.audience}

封面钩子：
${summary.hook}

素材正文：
${material.sourceText || "未提供正文，请仅根据主题与要点生成。"}

素材要点：
${summary.keyPoints.map((item, index) => `${index + 1}. ${item}`).join("\n")}

页面规划：
${plan.slides
    .map(
      (slide, index) =>
        `${index + 1}. 模板=${slide.templateId} | purpose=${slide.purpose} | headline=${slide.headline} | keyPoint=${slide.keyPoint}`
    )
    .join("\n")}

槽位限制：
${slotLines}

要求：
- 用中文，短句优先。
- 禁止使用 emoji、特殊符号、花体字符。
- 每页标题要完整，不留半句。
- 文案要像真实小红书卡片，不要写成摘要腔。
- 必须保留 plan 里的 templateId 顺序。
- values 字段必须完整匹配对应模板的槽位。

输出格式：
{
  "summary": "一句总述",
  "slides": [
    {
      "templateId": "cover-hero",
      "values": {
        "slot": "文案"
      }
    }
  ]
}

只输出合法 JSON。
  `.trim();
}

function sanitizeSlideValues(templateId: XhsSlideTemplateId, values: Record<string, string>) {
  const template = TEMPLATE_REGISTRY.getById(templateId);
  if (!template) {
    return values;
  }

  return Object.fromEntries(
    template.slots.map((slot) => {
      const rawValue = stripUnsupportedText(values[slot.id] ?? "");
      const cleaned = truncateTextSoft(rawValue, slot.maxLength * slot.maxLines);
      return [slot.id, cleaned];
    })
  );
}

function sanitizeComposeOutput(output: ComposeStageOutput) {
  return {
    summary: truncateTextSoft(stripUnsupportedText(output.summary), 72),
    slides: output.slides.map((slide) => ({
      ...slide,
      values: sanitizeSlideValues(slide.templateId, slide.values)
    }))
  };
}

function fallbackSummary(material: MaterialPack): SummaryStageOutput {
  const seedPoints = material.keyPoints.length > 0
    ? material.keyPoints
    : normalizeLines(material.sourceText).slice(0, 4).map((line) => truncateTextSoft(line, 26));

  return {
    topic: material.topic,
    angle: truncateTextSoft(`围绕${material.topic}提炼外部素材中的核心变化与行动点`, 28),
    audience: material.audience,
    summary: truncateTextSoft(`这组图文围绕 ${material.topic}，适合给 ${material.audience} 快速看懂重点。`, 72),
    hook: truncateTextSoft(material.prompt || material.topic, 18),
    keyPoints: (seedPoints.length > 0 ? seedPoints : ["先讲清重点", "再讲影响", "最后讲行动"]).slice(0, 5),
    styleHints: ["短句表达", "结论先行", "适合做卡片阅读"]
  };
}

function fallbackPlan(material: MaterialPack, slideCount: number): PlanStageOutput {
  const templateIds = pickTemplateVariant(material, slideCount);
  const headlines = [
    truncateTextSoft(material.topic, 20),
    "先把重点讲清楚",
    "最值得看的三点",
    "前后变化怎么看",
    "最后给一个动作"
  ];
  const keyPoints = material.keyPoints.length > 0 ? material.keyPoints : ["先讲事实", "再讲影响", "补充判断", "给出建议"];

  return {
    summary: truncateTextSoft(`先用封面抛钩子，再按信息拆解、对比说明和收尾动作来组织。`, 40),
    slides: templateIds.map((templateId, index) => ({
      templateId,
      purpose: ["封面钩子", "信息拆解", "重点展开", "对比说明", "收尾行动"][index] || "内容补充",
      headline: headlines[index] || truncateTextSoft(material.topic, 18),
      keyPoint: keyPoints[index] || keyPoints[keyPoints.length - 1] || material.topic
    }))
  };
}

function parseWithSchema<T>(text: string, schema: z.ZodSchema<T>) {
  return schema.safeParse(safeJsonParse(text));
}

async function runStructuredStage<T>(
  provider: OpenAiProvider,
  buildPrompt: () => string,
  schema: z.ZodSchema<T>,
  timeoutMs: number
) {
  let lastError = "Structured output parse failed.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const prompt = attempt === 0
      ? buildPrompt()
      : `${buildPrompt()}\n\n请重新输出一次，只保留 JSON，字段必须完整匹配。`;
    const response = await provider.generateStructuredText(prompt, { timeoutMs });
    const parsed = parseWithSchema(response.text, schema);
    if (parsed.success) {
      return parsed.data;
    }

    lastError = parsed.error.issues[0]?.message || lastError;
  }

  throw new MidMintError(lastError);
}

function buildSlidesFromCompose(output: ComposeStageOutput) {
  return output.slides.map((item, index) => {
    const template = TEMPLATE_REGISTRY.getById(item.templateId);
    if (!template) {
      throw new MidMintError(`Template ${item.templateId} not found.`);
    }

    const svg = exportSvg(template, item.values);
    const slide: XhsSlide = {
      id: createId("slide"),
      index: index + 1,
      templateId: item.templateId,
      values: item.values,
      svg
    };
    return slide;
  });
}

async function runStage<T>(
  logs: XhsLogEntry[],
  stage: string,
  message: string,
  task: () => Promise<T>
) {
  logs.push({ stage, status: "start", message });
  const startedAt = Date.now();
  try {
    const result = await task();
    logs.push({
      stage,
      status: "success",
      message,
      durationMs: Date.now() - startedAt
    });
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown error";
    logs.push({
      stage,
      status: "error",
      message: `${message}: ${detail}`,
      durationMs: Date.now() - startedAt
    });
    throw error;
  }
}

export async function generateXhsDeck(request: XhsDeckRequest): Promise<XhsDeckResult> {
  if (!request.prompt?.trim()) {
    throw new MidMintError("Prompt is required.");
  }

  const requestStartedAt = Date.now();
  const logs: XhsLogEntry[] = [];
  const slideCount = request.slideCount === 4 ? 4 : 5;
  const provider = new OpenAiProvider();
  const material = buildMaterialPack(request);

  logs.push({
    stage: "prepare",
    status: "success",
    message: `准备生成 ${slideCount} 页内容，模型 ${provider.getConfig().model}`
  });

  let summaryData: SummaryStageOutput;
  try {
    summaryData = await runStage(logs, "summarize", "总结外部素材", async () => {
      return await runStructuredStage(provider, () => buildSummaryPrompt(material), summarySchema, 30000);
    });
  } catch {
    logs.push({
      stage: "summarize",
      status: "fallback",
      message: "素材总结失败，已切换本地 fallback 总结"
    });
    summaryData = fallbackSummary(material);
  }

  let planData: PlanStageOutput;
  try {
    planData = await runStage(logs, "plan", "规划模板与页序", async () => {
      return await runStructuredStage(
        provider,
        () => buildPlanPrompt(material, slideCount, summaryData, pickTemplateVariant(material, slideCount)),
        planSchema,
        30000
      );
    });
  } catch {
    logs.push({
      stage: "plan",
      status: "fallback",
      message: "模板规划失败，已切换本地 fallback 规划"
    });
    planData = fallbackPlan(material, slideCount);
  }

  let composed: ComposeStageOutput;
  try {
    composed = await runStage(logs, "compose", "生成每页模板槽位文案", async () => {
      const result = await runStructuredStage(
        provider,
        () => buildComposePrompt(material, summaryData, planData),
        composeSchema,
        35000
      );
      return sanitizeComposeOutput({
        summary: result.summary,
        slides: result.slides.slice(0, slideCount)
      });
    });
  } catch {
    logs.push({
      stage: "compose",
      status: "fallback",
      message: "槽位文案生成失败，已切换本地 fallback 文案"
    });
    composed = fallbackDeckOutline(material.prompt, material.topic, slideCount);
  }

  const createdAt = new Date().toISOString();
  const slides = await runStage(logs, "render", "渲染 SVG 卡片", async () => {
    return buildSlidesFromCompose({
      summary: composed.summary,
      slides: composed.slides.slice(0, slideCount)
    });
  });
  const saved = await runStage(logs, "save", "落盘生成结果", async () => {
    return saveDeckBundle({
      prompt: material.prompt,
      topic: material.topic,
      slideCount,
      summary: composed.summary || summaryData.summary,
      slides,
      createdAt
    });
  });

  logs.push({
    stage: "complete",
    status: "success",
    message: "整组素材生成完成",
    durationMs: Date.now() - requestStartedAt
  });

  return {
    prompt: material.prompt,
    topic: material.topic,
    slideCount,
    summary: composed.summary || summaryData.summary,
    slides,
    outputDir: saved.outputDir,
    htmlPath: saved.htmlPath,
    createdAt,
    logs
  };
}
