import { normalizeText, truncateText } from "@/infra/utils/text";
import type { ContentBrief, DeckPageType, DeckPlan, DeckSlide, ParsedSource } from "@/core/domain/types";

function dedupe(values: string[]) {
  return Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
}

function joinBody(parts: string[], maxLength: number) {
  return truncateText(
    dedupe(parts)
      .filter(Boolean)
      .join(" / "),
    maxLength
  );
}

function buildSlide(
  index: number,
  pageType: DeckPageType,
  goal: string,
  title: string,
  body: string,
  highlights: string[],
  templateId: DeckSlide["templateId"]
): DeckSlide {
  return {
    index,
    pageType,
    goal,
    title: normalizeText(title),
    body: normalizeText(body),
    highlights: dedupe(highlights).slice(0, 3),
    templateId,
    values: {},
    charCountTitle: normalizeText(title).length,
    charCountBody: normalizeText(body).length
  };
}

function buildMiddleHighlights(parsedSource: ParsedSource, contentBrief: ContentBrief) {
  const candidates = dedupe([
    ...contentBrief.keyTakeaways,
    ...contentBrief.mustInclude,
    ...parsedSource.keyFacts,
    ...parsedSource.keyPoints,
    ...(parsedSource.riskFlags.length > 0 ? parsedSource.riskFlags.map((flag) => `注意：${flag}`) : [])
  ]);

  return candidates;
}

export function buildDeckPlan(parsedSource: ParsedSource, contentBrief: ContentBrief): DeckPlan {
  const highlights = buildMiddleHighlights(parsedSource, contentBrief);
  const firstTakeaway = highlights[0] ?? contentBrief.topic;
  const secondTakeaway = highlights[1] ?? parsedSource.summary;
  const thirdTakeaway = highlights[2] ?? contentBrief.narrative;
  const fourthTakeaway = highlights[3] ?? contentBrief.contentGoal ?? contentBrief.audience;

  const slides: DeckSlide[] = [
    buildSlide(
      1,
      "cover",
      "先抛结论和钩子",
      truncateText(`${contentBrief.topic}，先看这个结论`, 28),
      truncateText(contentBrief.narrative, 72),
      [contentBrief.keyTakeaways[0] ?? firstTakeaway, contentBrief.mustInclude[0] ?? secondTakeaway],
      "cover-hero"
    ),
    buildSlide(
      2,
      "summary",
      "把核心信息讲清楚",
      truncateText("先看这 3 个重点", 18),
      joinBody([firstTakeaway, secondTakeaway, contentBrief.keyTakeaways[1] ?? "补充背景"], 88),
      [firstTakeaway, secondTakeaway, contentBrief.keyTakeaways[1] ?? ""],
      "step-list"
    ),
    buildSlide(
      3,
      "detail",
      "展开最重要的一层",
      truncateText("为什么这件事值得看", 18),
      joinBody([secondTakeaway, thirdTakeaway, contentBrief.mustInclude[1] ?? "补充一个关键事实"], 92),
      [secondTakeaway, thirdTakeaway, contentBrief.mustInclude[1] ?? ""],
      "triple-cards"
    ),
    buildSlide(
      4,
      "comparison",
      "给读者一个判断视角",
      truncateText("事实 vs. 影响", 18),
      joinBody([parsedSource.summary, contentBrief.avoid[0] ?? "避免长篇背景铺陈", fourthTakeaway], 96),
      [parsedSource.summary, fourthTakeaway, contentBrief.avoid[0] ?? ""],
      "story-split"
    ),
    buildSlide(
      5,
      "cta",
      "把下一步收住",
      truncateText("你会怎么做？", 18),
      joinBody(
        [
          contentBrief.contentGoal || contentBrief.narrative,
          contentBrief.mustInclude[0] ?? contentBrief.topic,
          "欢迎继续补充你的判断"
        ],
        84
      ),
      [contentBrief.contentGoal || contentBrief.topic, contentBrief.mustInclude[0] ?? ""],
      "quote-cta"
    )
  ];

  return {
    summary: truncateText(
      `${contentBrief.topic} 适合用 ${contentBrief.angle} 的方式拆成 5 页，先结论后展开。`,
      120
    ),
    slides,
    cta: normalizeText(contentBrief.contentGoal || contentBrief.narrative || "欢迎继续补充你的判断")
  };
}
