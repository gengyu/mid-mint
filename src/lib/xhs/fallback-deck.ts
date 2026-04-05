import type { NewsArticle } from "@/lib/news/fetch-news";
import type { XhsSlideTemplateId } from "@/lib/xhs/types";

export type DeckOutlineSlide = {
  templateId: XhsSlideTemplateId;
  values: Record<string, string>;
};

function cut(value: string, max = 26) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function linesFromArticle(article: NewsArticle, max = 5) {
  const seed = [article.title, article.source, article.snippet]
    .join(" ")
    .split(/[。；;，,]/)
    .map((part) => cut(part, 18))
    .filter(Boolean);

  return seed.slice(0, max);
}

export function fallbackDeckOutline(
  prompt: string,
  topic: string,
  slideCount: number,
  sources: NewsArticle[]
): { summary: string; slides: DeckOutlineSlide[] } {
  const [first, second, third] = sources;
  const summary = first
    ? `${cut(first.title, 36)}，这是今天 ${topic} 里最值得展开的一条。`
    : `围绕 ${topic} 生成一组适合发布的小红书图文素材。`;

  const slides: DeckOutlineSlide[] = [
    {
      templateId: "cover-hero",
      values: {
        eyebrow: "今日 AI",
        title: cut(first?.title || prompt, 22),
        subtitle: cut(first?.snippet || `围绕 ${topic} 快速提炼要点`, 28),
        highlight: cut(summary, 34),
        featureA: "新闻点",
        featureADesc: cut(first?.source || "重点事件", 16),
        featureB: "为什么火",
        featureBDesc: cut(second?.title || "行业影响", 16),
        featureC: "可跟进",
        featureCDesc: cut(third?.title || "后续观察", 18)
      }
    },
    {
      templateId: "step-list",
      values: {
        eyebrow: "快速看完",
        title: "今天这条新闻怎么拆",
        subtitle: "先交代事实，再给读者一个清晰判断。",
        step1: cut(first?.title || "今天的核心事件", 20),
        step2: cut(first?.snippet || "提炼第一层背景", 20),
        step3: cut(second?.title || "补充第二条关联动态", 20),
        step4: cut(third?.title || "补充第三条市场反馈", 20),
        step5: "最后给出你的判断",
        footer: "这页适合做信息总览，读者能马上进入状态。"
      }
    },
    {
      templateId: "triple-cards",
      values: {
        eyebrow: "三点提炼",
        title: "这条新闻最值得看的点",
        subtitle: "把冗长原文压缩成三块信息，比较适合传播。",
        cardA: "事实",
        cardAL1: cut(linesFromArticle(first || second || third || {} as NewsArticle)[0] || "发生了什么", 10),
        cardAL2: cut(linesFromArticle(first || second || third || {} as NewsArticle)[1] || "谁发布的", 10),
        cardAL3: cut(linesFromArticle(first || second || third || {} as NewsArticle)[2] || "时间节点", 10),
        cardB: "影响",
        cardBL1: cut(linesFromArticle(second || first || third || {} as NewsArticle)[0] || "行业变化", 10),
        cardBL2: cut(linesFromArticle(second || first || third || {} as NewsArticle)[1] || "用户影响", 10),
        cardBL3: cut(linesFromArticle(second || first || third || {} as NewsArticle)[2] || "商业信号", 10),
        cardC: "动作",
        cardCL1: "继续追踪",
        cardCL2: "补充观点",
        cardCL3: "整理选题",
        footer: "三卡片结构很适合做小红书第二屏或第三屏。"
      }
    },
    {
      templateId: "story-split",
      values: {
        eyebrow: "怎么理解",
        title: "新闻事实和行业判断分开讲",
        subtitle: "左边讲发生了什么，右边讲这对读者意味着什么。",
        leftLabel: "事实层",
        leftTitle: cut(first?.title || "核心变化", 12),
        leftBody: cut(first?.snippet || "先讲清楚新闻事实和关键数据。", 34),
        rightLabel: "判断层",
        rightTitle: cut(second?.title || "值得关注", 12),
        rightBody: cut(second?.snippet || "再给出这条新闻背后的行业判断。", 34),
        footer: "把事实和观点拆开，读者更容易接受。"
      }
    },
    {
      templateId: "quote-cta",
      values: {
        eyebrow: "发布建议",
        title: "这组图文适合今天发",
        subtitle: cut(`用 ${topic} 这个话题切入，再补上你的行业判断和后续观察。`, 28),
        button: "继续更新下一条",
        footer: "mid-mint x 小红书素材"
      }
    }
  ];

  return {
    summary,
    slides: slides.slice(0, slideCount)
  };
}
