import type { GeneratedCopy, TemplateSchema } from "@/lib/templates/types";
import { truncateText } from "@/lib/utils/text";

const templateDefaults: Record<string, Record<string, string>> = {
  "cover-hero": {
    eyebrow: "小龙虾安装器",
    title: "不会命令行 也能装 OpenClaw",
    subtitle: "安装 + 配置 + 插件接入，一个桌面应用搞定",
    highlight: "适合不想折腾命令行、想快速装起 OpenClaw 的人",
    featureA: "环境检测",
    featureADesc: "先看本机状态",
    featureB: "图形化配置",
    featureBDesc: "模型 / 渠道 / workspace",
    featureC: "插件接入",
    featureCDesc: "安装状态更清楚"
  },
  "feature-compare": {
    eyebrow: "小龙虾安装器",
    title: "别再手改",
    titleAccent: "openclaw.json",
    subtitle: "把安装和高频配置收成一个图形界面",
    leftTitle: "传统流程",
    left1: "1. 查环境",
    left2: "2. 装 CLI",
    left3: "3. 初始化",
    left4: "4. 改配置文件",
    left5: "5. 接模型和插件",
    leftFoot: "容易漏步骤，也不容易排错",
    rightTitle: "现在的流程",
    right1: "1. 打开安装器",
    right2: "2. 自动检测状态",
    right3: "3. 点安装或更新",
    right4: "4. 在界面里填配置",
    right5: "5. 看插件状态反馈",
    rightFoot: "更适合不想折腾命令行的用户",
    footer: "环境检测 / 图形化配置 / 插件接入 / workspace 管理"
  },
  "team-delivery": {
    eyebrow: "团队交付场景",
    title: "给团队交付 OpenClaw 需要一个统一入口",
    subtitle: "安装 / 配置 / 插件 / workspace 别让每个人各配各的",
    cardA: "环境统一",
    cardALine1: "少一些",
    cardALine2: "机器差异带来的",
    cardALine3: "安装问题",
    cardB: "流程统一",
    cardBLine1: "从检测到配置",
    cardBLine2: "步骤更容易",
    cardBLine3: "复现",
    cardC: "状态统一",
    cardCLine1: "插件安装中",
    cardCLine2: "成功失败",
    cardCLine3: "更直观",
    lead: "更适合这些人：",
    bullet1: "- 帮同事搭环境的人",
    bullet2: "- 想做统一安装入口的团队负责人",
    bullet3: "- 需要导入、导出和分享 agent bundle 的场景",
    footer: "桌面安装器的价值，不只是能装上，而是更容易交付给别人"
  },
  "story-split": {
    eyebrow: "核心变化",
    title: "把复杂流程换成更友好的入口",
    subtitle: "适合讲清楚过去和现在的差别",
    leftLabel: "以前",
    leftTitle: "步骤分散",
    leftBody: "命令行 配置文件 插件文档 来回切换",
    rightLabel: "现在",
    rightTitle: "入口统一",
    rightBody: "先看状态 再安装 再在界面里完成高频配置",
    footer: "入口越清楚，越容易让别人顺利开始"
  },
  "triple-cards": {
    eyebrow: "三点说明",
    title: "把核心信息拆成三张卡片",
    subtitle: "适合讲痛点、受众或收益",
    cardA: "安装难",
    cardAL1: "环境不同",
    cardAL2: "步骤分散",
    cardAL3: "容易卡住",
    cardB: "配置散",
    cardBL1: "模型入口",
    cardBL2: "路径字段",
    cardBL3: "不够直观",
    cardC: "状态乱",
    cardCL1: "插件结果",
    cardCL2: "成功失败",
    cardCL3: "不够清楚",
    footer: "把信息拆开讲，阅读负担会轻很多"
  },
  "step-list": {
    eyebrow: "流程清单",
    title: "把步骤说清楚",
    subtitle: "适合讲流程或演示路径",
    step1: "第一步",
    step2: "第二步",
    step3: "第三步",
    step4: "第四步",
    step5: "第五步",
    footer: "沿着统一路径走，体验会稳定很多"
  },
  "quote-cta": {
    eyebrow: "结论页",
    title: "把最重要的一句话放大",
    subtitle: "适合尾页、结论页和留言引导",
    button: "继续交流",
    footer: "mid-mint"
  }
};

export function fallbackGenerateCopy(prompt: string, template: TemplateSchema): GeneratedCopy {
  const defaults = templateDefaults[template.meta.id] ?? {};
  const promptHint = prompt.replace(/\s+/g, " ").trim();

  const values = Object.fromEntries(
    template.slots.map((slot, index) => {
      const base = defaults[slot.id] ?? `${promptHint.slice(0, Math.max(4, slot.maxLength - 2))}${index + 1}`;
      return [slot.id, truncateText(base, slot.maxLength * slot.maxLines)];
    })
  );

  return {
    templateId: template.meta.id,
    values
  };
}
