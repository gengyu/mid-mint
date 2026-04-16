import { normalizeText, truncateText } from "@/infra/utils/text";
import type { ContentAngle, ContentBrief, ParsedSource } from "@/core/domain/types";

const angleKeywords: Array<{ angle: ContentAngle; tokens: string[] }> = [
  { angle: "pitfall_alert", tokens: ["避坑", "风险", "注意", "坑", "警惕"] },
  { angle: "tool_summary", tokens: ["工具", "工具总结", "产品", "方案"] },
  { angle: "method_summary", tokens: ["方法", "步骤", "流程", "怎么做"] },
  { angle: "industry_impact", tokens: ["行业", "影响", "趋势", "市场", "产业"] },
  { angle: "practitioner_view", tokens: ["从业者", "实操", "实战", "经验"] },
  { angle: "experience_breakdown", tokens: ["复盘", "经历", "过程", "拆解"] },
  { angle: "product_opportunity", tokens: ["机会", "增长", "商业", "产品"] },
  { angle: "key_points", tokens: ["重点", "核心", "要点", "结论"] }
];

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

function chooseAngle(parsedSource: ParsedSource, goal: string, style: string): ContentAngle {
  const corpus = `${parsedSource.title} ${parsedSource.summary} ${parsedSource.keyFacts.join(" ")} ${goal} ${style}`;
  const matched = angleKeywords.find((item) => item.tokens.some((token) => corpus.includes(token)));
  return matched?.angle ?? "quick_view";
}

function pickAudience(parsedSource: ParsedSource, targetAudience: string) {
  return normalizeText(targetAudience) || normalizeText(parsedSource.summary.split(/[。！？!?]/)[0] || "") || "对该主题感兴趣的人";
}

function buildNarrative(parsedSource: ParsedSource, audience: string, angle: ContentAngle, goal: string) {
  const opening = goal ? `这篇内容围绕“${truncateText(goal, 18)}”来讲。` : "这篇内容会先讲结论，再讲理由。";
  const angleMap: Record<ContentAngle, string> = {
    quick_view: "先把最关键的信息压缩成一眼能懂的版本。",
    key_points: "把原始信息拆成几个读者最关心的重点。",
    industry_impact: "重点放在它对行业和读者意味着什么。",
    practitioner_view: "用更接近实操和经验的方式来表达。",
    product_opportunity: "把机会点和可行动方向讲清楚。",
    tool_summary: "围绕工具、方案或产品做直接总结。",
    pitfall_alert: "先提示风险，再给出规避建议。",
    experience_breakdown: "按过程拆解，帮助读者快速理解。",
    method_summary: "把方法拆成可执行步骤，降低理解门槛。"
  };

  const closing = `写法上尽量保持短句、强结论，适合${audience}快速浏览。`;
  return normalizeText(
    [opening, angleMap[angle], truncateText(parsedSource.summary, 50), closing].join(" ")
  );
}

function pickTakeaways(parsedSource: ParsedSource, goal: string) {
  const candidates = dedupe([
    ...parsedSource.keyPoints,
    ...parsedSource.keyFacts,
    ...(parsedSource.riskFlags.length > 0 ? parsedSource.riskFlags.map((flag) => `风险：${flag}`) : []),
    ...(goal ? [goal] : [])
  ]);

  const takeaways = candidates.slice(0, 5);
  if (takeaways.length >= 3) {
    return takeaways;
  }

  return dedupe([
    ...takeaways,
    ...parsedSource.summary.split(/[。！？!?；;]/).map((item) => item.trim()).filter(Boolean)
  ]).slice(0, 5);
}

function pickMustInclude(parsedSource: ParsedSource, takeaways: string[]) {
  return dedupe([
    parsedSource.title,
    ...parsedSource.keyFacts.slice(0, 2),
    ...takeaways.slice(0, 2)
  ]).slice(0, 5);
}

function pickAvoid(parsedSource: ParsedSource, style: string) {
  const avoid = [
    "空话堆砌",
    "长段落",
    "新闻播报式",
    "术语堆砌"
  ];

  if (!normalizeText(style)) {
    avoid.unshift("风格不明确");
  }
  if (parsedSource.riskFlags.length > 0) {
    avoid.unshift("未经核实的断言");
  }

  return dedupe(avoid).slice(0, 5);
}

export function buildContentBrief(
  parsedSource: ParsedSource,
  targetAudience: string,
  contentGoal: string,
  preferredStyle: string
): ContentBrief {
  const angle = chooseAngle(parsedSource, contentGoal, preferredStyle);
  const audience = pickAudience(parsedSource, targetAudience);
  const takeaways = pickTakeaways(parsedSource, contentGoal);

  return {
    topic: normalizeText(parsedSource.title || contentGoal || parsedSource.summary.slice(0, 18) || "未命名主题"),
    angle,
    audience,
    narrative: buildNarrative(parsedSource, audience, angle, contentGoal),
    keyTakeaways: takeaways.length >= 3 ? takeaways.slice(0, 5) : ["先抓重点", "再讲影响", "最后给行动建议"],
    mustInclude: pickMustInclude(parsedSource, takeaways),
    avoid: pickAvoid(parsedSource, preferredStyle),
    contentGoal: normalizeText(contentGoal)
  };
}
