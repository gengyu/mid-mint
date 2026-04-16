import type { XhsSlideTemplateId } from "@/platforms/xiaohongshu/types";
import { stripUnsupportedText, truncateTextSoft } from "@/infra/utils/text";

export type DeckOutlineSlide = {
  templateId: XhsSlideTemplateId;
  values: Record<string, string>;
};

function cut(value: string, max = 26) {
  return truncateTextSoft(stripUnsupportedText(value), max);
}

function linesFromTopic(topic: string, max = 5) {
  const seed = stripUnsupportedText(topic)
    .split(/[。；;，,]/)
    .map((part) => cut(part, 18))
    .filter(Boolean);

  return seed.slice(0, max);
}

export function fallbackDeckOutline(
  prompt: string,
  topic: string,
  slideCount: number
): { summary: string; slides: DeckOutlineSlide[] } {
  const summary = `围绕 ${topic} 生成一组适合发布的小红书图文素材。`;

  const isWorkflowTopic = /(团队|交付|协作|部署|安装|工作流|工具|SOP|流程)/.test(topic);
  const comparisonTemplate: XhsSlideTemplateId = isWorkflowTopic ? "feature-compare" : "story-split";
  const middleTemplate: XhsSlideTemplateId = isWorkflowTopic ? "team-delivery" : "triple-cards";

  const slides: DeckOutlineSlide[] = [
    {
      templateId: "cover-hero",
      values: {
        eyebrow: "今日 AI",
        title: cut(prompt, 22),
        subtitle: cut(`围绕 ${topic} 快速提炼要点`, 28),
        highlight: cut(summary, 34),
        featureA: "新闻点",
        featureADesc: "重点事件",
        featureB: "为什么火",
        featureBDesc: "行业影响",
        featureC: "可跟进",
        featureCDesc: "后续观察"
      }
    },
    {
      templateId: "step-list",
      values: {
        eyebrow: "快速看完",
        title: "今天这条新闻怎么拆",
        subtitle: "先交代事实，再给读者一个清晰判断。",
        step1: "今天的核心事件",
        step2: "提炼第一层背景",
        step3: "补充第二条关联动态",
        step4: "补充第三条市场反馈",
        step5: "最后给出你的判断",
        footer: "这页适合做信息总览，读者能马上进入状态。"
      }
    },
    {
      templateId: middleTemplate,
      values: {
        ...(middleTemplate === "team-delivery"
          ? {
              eyebrow: "落地分工",
              title: "这件事谁来做最合适",
              subtitle: "把动作拆给不同角色，整组内容更像能执行的方案。",
              cardA: "内容侧",
              cardALine1: cut(linesFromTopic(topic)[0] || "抓热点", 10),
              cardALine2: cut(linesFromTopic(topic)[1] || "写标题", 10),
              cardALine3: cut(linesFromTopic(topic)[2] || "做封面", 10),
              cardB: "运营侧",
              cardBLine1: cut(linesFromTopic(prompt)[0] || "发测试", 10),
              cardBLine2: cut(linesFromTopic(prompt)[1] || "看反馈", 10),
              cardBLine3: cut(linesFromTopic(prompt)[2] || "调方向", 10),
              cardC: "产品侧",
              cardCLine1: "补流程",
              cardCLine2: "提效率",
              cardCLine3: "收数据",
              lead: "优先做这些：",
              bullet1: "先把最能出结果的人群找出来",
              bullet2: "把动作拆成可复用的小步骤",
              bullet3: "拿反馈继续迭代下一轮",
              footer: "让内容从观点输出，变成真的可以执行。"
            }
          : {
              eyebrow: "三点提炼",
              title: "这条新闻最值得看的点",
              subtitle: "把冗长原文压缩成三块信息，比较适合传播。",
              cardA: "事实",
              cardAL1: cut(linesFromTopic(topic)[0] || "发生了什么", 10),
              cardAL2: cut(linesFromTopic(topic)[1] || "谁发布的", 10),
              cardAL3: cut(linesFromTopic(topic)[2] || "时间节点", 10),
              cardB: "影响",
              cardBL1: "行业变化",
              cardBL2: "用户影响",
              cardBL3: "商业信号",
              cardC: "动作",
              cardCL1: "继续追踪",
              cardCL2: "补充观点",
              cardCL3: "整理选题",
              footer: "三卡片结构很适合做小红书第二屏或第三屏。"
            })
      }
    },
    {
      templateId: comparisonTemplate,
      values: {
        ...(comparisonTemplate === "feature-compare"
          ? {
              eyebrow: "前后对比",
              title: "以前怎么做",
              titleAccent: "现在更适合怎么做",
              subtitle: "把老办法和新机会放在一页里，读者更容易记住。",
              leftTitle: "旧路径",
              left1: "动作分散",
              left2: "反馈慢",
              left3: "成本高",
              left4: "效率低",
              left5: "难复制",
              leftFoot: "继续沿用旧习惯，很难吃到新红利。",
              rightTitle: "新路径",
              right1: "选好赛道",
              right2: "快速试错",
              right3: "放大优势",
              right4: "形成模版",
              right5: "持续复盘",
              rightFoot: "先跑通一条链路，再批量放大。",
              footer: "一页讲清变化，读者更容易产生行动感。"
            }
          : {
              eyebrow: "怎么理解",
              title: "新闻事实和行业判断分开讲",
              subtitle: "左边讲发生了什么，右边讲这对读者意味着什么。",
              leftLabel: "事实层",
              leftTitle: "核心变化",
              leftBody: "先讲清楚核心事实和关键变化。",
              rightLabel: "判断层",
              rightTitle: "值得关注",
              rightBody: "再给出这条内容背后的行业判断。",
              footer: "把事实和观点拆开，读者更容易接受。"
            })
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
