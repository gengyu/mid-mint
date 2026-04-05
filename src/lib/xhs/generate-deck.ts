import { z } from "zod";
import { fetchLatestNews, type NewsArticle } from "@/lib/news/fetch-news";
import { OpenAiProvider } from "@/lib/llm/openai";
import { exportSvg } from "@/lib/renderer/export-svg";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import { createId } from "@/lib/utils/id";
import { MidMintError } from "@/lib/utils/errors";
import { safeJsonParse } from "@/lib/utils/json";
import { fallbackDeckOutline } from "@/lib/xhs/fallback-deck";
import { saveDeckBundle } from "@/lib/xhs/storage";
import type { XhsDeckRequest, XhsDeckResult, XhsLogEntry, XhsSlide, XhsSlideTemplateId } from "@/lib/xhs/types";

const slideSchema = z.object({
  templateId: z.enum(["cover-hero", "step-list", "triple-cards", "story-split", "quote-cta"]),
  values: z.record(z.string())
});

const deckSchema = z.object({
  summary: z.string(),
  slides: z.array(slideSchema).min(4).max(5)
});

const templateOrder = {
  4: ["cover-hero", "step-list", "triple-cards", "quote-cta"],
  5: ["cover-hero", "step-list", "triple-cards", "story-split", "quote-cta"]
} as const satisfies Record<4 | 5, XhsSlideTemplateId[]>;

function normalizeTopic(request: XhsDeckRequest) {
  return (request.topic || request.prompt || "今日 AI 最新新闻").trim();
}

function buildDeckPrompt(topic: string, slideCount: number, sources: NewsArticle[]) {
  const orderedTemplates = templateOrder[slideCount as 4 | 5];
  return `
你是一个小红书图文编辑。请根据主题和新闻素材，输出 ${slideCount} 页轮播图的结构化 JSON。

主题：
${topic}

必须按以下模板顺序输出 slides：
${orderedTemplates.map((item, index) => `${index + 1}. ${item}`).join("\n")}

可参考新闻：
${sources
  .map(
    (source, index) =>
      `${index + 1}. 标题：${source.title}\n来源：${source.source}\n时间：${source.publishedAt}\n摘要：${source.snippet}\n链接：${source.link}`
  )
  .join("\n\n")}

要求：
- 语言自然，适合小红书信息卡片。
- 用中文，短句优先，不要堆砌空话。
- 不要出现“第1页/第2页”这类版式说明。
- values 里的字段必须完全匹配模板槽位。
- 所有文案都要控制在卡片长度内，尽量少于槽位上限。
- summary 用 1-2 句话说明本组图文适合怎么发。

模板槽位：
- cover-hero: eyebrow,title,subtitle,highlight,featureA,featureADesc,featureB,featureBDesc,featureC,featureCDesc
- step-list: eyebrow,title,subtitle,step1,step2,step3,step4,step5,footer
- triple-cards: eyebrow,title,subtitle,cardA,cardAL1,cardAL2,cardAL3,cardB,cardBL1,cardBL2,cardBL3,cardC,cardCL1,cardCL2,cardCL3,footer
- story-split: eyebrow,title,subtitle,leftLabel,leftTitle,leftBody,rightLabel,rightTitle,rightBody,footer
- quote-cta: eyebrow,title,subtitle,button,footer

输出格式：
{
  "summary": "一句总结",
  "slides": [
    {
      "templateId": "cover-hero",
      "values": {
        "slot": "文案"
      }
    }
  ]
}

只输出合法 JSON，不要输出 markdown。
  `.trim();
}

async function generateOutlineWithModel(topic: string, slideCount: number, sources: NewsArticle[]) {
  const provider = new OpenAiProvider();
  const text = await provider.generateStructuredText(buildDeckPrompt(topic, slideCount, sources));
  const parsed = deckSchema.safeParse(safeJsonParse(text));
  if (!parsed.success) {
    throw new MidMintError("Deck outline parse failed.");
  }

  return parsed.data;
}

function buildSlidesFromOutline(outline: { templateId: XhsSlideTemplateId; values: Record<string, string> }[]) {
  return outline.map((item, index) => {
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
  const topic = normalizeTopic(request);
  const useLatestNews = request.useLatestNews !== false;
  const provider = new OpenAiProvider();
  logs.push({
    stage: "prepare",
    status: "success",
    message: `准备生成 ${slideCount} 页内容，模型 ${provider.getConfig().model}`
  });

  let sources: NewsArticle[] = [];
  if (useLatestNews) {
    try {
      sources = await runStage(logs, "news", "抓取最新新闻", async () => {
        return await fetchLatestNews(topic, 6, 8000);
      });
    } catch {
      logs.push({
        stage: "news",
        status: "fallback",
        message: "新闻抓取失败，继续使用主题直出文案"
      });
      sources = [];
    }
  } else {
    logs.push({
      stage: "news",
      status: "skipped",
      message: "已关闭联网抓取，直接根据主题生成"
    });
  }

  let summary = "";
  let outlineSlides: Array<{ templateId: XhsSlideTemplateId; values: Record<string, string> }> = [];

  try {
    const outlined = await runStage(logs, "llm", "调用大模型生成图文结构", async () => {
      return await generateOutlineWithModel(topic, slideCount, sources);
    });
    summary = outlined.summary;
    outlineSlides = outlined.slides as Array<{ templateId: XhsSlideTemplateId; values: Record<string, string> }>;
  } catch {
    logs.push({
      stage: "llm",
      status: "fallback",
      message: "大模型调用失败或输出不可解析，已切换本地 fallback"
    });
    const fallback = fallbackDeckOutline(request.prompt, topic, slideCount, sources);
    summary = fallback.summary;
    outlineSlides = fallback.slides;
  }

  const createdAt = new Date().toISOString();
  const slides = await runStage(logs, "render", "渲染 SVG 卡片", async () => {
    return buildSlidesFromOutline(outlineSlides.slice(0, slideCount));
  });
  const saved = await runStage(logs, "save", "落盘生成结果", async () => {
    return saveDeckBundle({
      prompt: request.prompt,
      topic,
      slideCount,
      summary,
      slides,
      sources,
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
    prompt: request.prompt,
    topic,
    slideCount,
    summary,
    slides,
    sources,
    outputDir: saved.outputDir,
    htmlPath: saved.htmlPath,
    createdAt,
    logs
  };
}
