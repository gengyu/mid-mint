import type {
  ContentBrief,
  DeckPlan,
  ParsedSource,
  RenderResult,
  ReviewResult,
  ReviewStageScores,
  VisualSpec
} from "@/modules/domain/types";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function repeatedTitles(deckPlan: DeckPlan) {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const slide of deckPlan.slides) {
    const normalized = slide.title.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    if (seen.has(normalized)) {
      duplicates.push(slide.title);
    }
    seen.add(normalized);
  }

  return duplicates;
}

function weakHook(title: string) {
  return title.length < 8 || !/[？!！:：]|看懂|为什么|怎么|别再|一图/.test(title);
}

function genericPhraseCount(deckPlan: DeckPlan) {
  const genericPatterns = ["值得关注", "不容忽视", "带来变化", "新的机会", "需要重视"];
  return deckPlan.slides.reduce((count, slide) => {
    return count + genericPatterns.filter((pattern) => slide.body.includes(pattern) || slide.title.includes(pattern)).length;
  }, 0);
}

function factualRiskCount(parsedSource: ParsedSource) {
  return parsedSource.riskFlags.length;
}

function decide(score: number, blockingIssues: string[]) {
  if (score < 50 || blockingIssues.length > 0) {
    return "block" as const;
  }
  if (score < 80) {
    return "rewrite" as const;
  }
  return "approve" as const;
}

function pickRewriteStage(issues: string[]) {
  if (issues.some((issue) => issue.includes("事实") || issue.includes("来源"))) {
    return "source-parse" as const;
  }
  if (issues.some((issue) => issue.includes("叙事") || issue.includes("受众") || issue.includes("角度"))) {
    return "brief" as const;
  }
  if (issues.some((issue) => issue.includes("封面") || issue.includes("重复") || issue.includes("页") || issue.includes("文案"))) {
    return "deck" as const;
  }
  if (issues.some((issue) => issue.includes("视觉") || issue.includes("溢出") || issue.includes("模板"))) {
    return "visual" as const;
  }

  return "deck" as const;
}

export class Reviewer {
  async run(input: {
    parsedSource: ParsedSource;
    contentBrief: ContentBrief;
    deckPlan: DeckPlan;
    visualSpec: VisualSpec;
    renderResult: RenderResult;
  }): Promise<ReviewResult> {
    const issues: string[] = [];
    const blockingIssues: string[] = [];
    const strengths: string[] = [];
    const suggestedFixes: string[] = [];

    const cover = input.deckPlan.slides[0];
    const duplicates = repeatedTitles(input.deckPlan);
    const overflowCount = input.renderResult.assets.filter((asset) => asset.overflowDetected).length;
    const genericCount = genericPhraseCount(input.deckPlan);
    const factRiskCount = factualRiskCount(input.parsedSource);

    if (weakHook(cover?.title || "")) {
      issues.push("封面钩子偏弱");
      suggestedFixes.push("强化封面标题的结论感或问题感");
    } else {
      strengths.push("封面标题具备基本钩子");
    }

    if (duplicates.length > 0) {
      issues.push("中间页标题存在重复");
      suggestedFixes.push("让每页承担不同信息目标，避免重复表达");
    } else {
      strengths.push("页间主题分工清晰");
    }

    if (overflowCount > 0) {
      issues.push(`有 ${overflowCount} 页存在溢出风险`);
      suggestedFixes.push("压缩单页文案长度或切换更宽松模板");
    } else {
      strengths.push("当前模板承载量基本合理");
    }

    if (input.visualSpec.warnings.length > 0) {
      issues.push("视觉匹配阶段发出了密度或模板风险警告");
    }

    if (genericCount >= 2) {
      issues.push("文案存在泛化表达，像新闻搬运");
      suggestedFixes.push("用更具体的场景和动作替代空泛判断");
    } else {
      strengths.push("文案相对具体，没有明显空话堆积");
    }

    if (factRiskCount > 0) {
      issues.push("解析阶段标记了事实风险");
      suggestedFixes.push("在 parse 和 brief 阶段补齐来源、时间和限定表达");
    }

    if (input.contentBrief.keyTakeaways.length < 3) {
      blockingIssues.push("关键信息不足，无法支撑完整 deck");
    }
    if (factRiskCount >= 3) {
      blockingIssues.push("事实风险过高");
    }

    const stageScores: ReviewStageScores = {
      xiaohongshuFit: clampScore(88 - genericCount * 10 - (weakHook(cover?.title || "") ? 12 : 0)),
      hookStrength: clampScore(92 - (weakHook(cover?.title || "") ? 28 : 6)),
      readability: clampScore(88 - overflowCount * 14),
      densityControl: clampScore(86 - overflowCount * 18 - (input.visualSpec.densityLevel === "high" ? 10 : 0)),
      factualSafety: clampScore(92 - factRiskCount * 18),
      originality: clampScore(84 - genericCount * 12),
      visualFit: clampScore(86 - input.visualSpec.warnings.length * 10)
    };

    const score = clampScore(
      Object.values(stageScores).reduce((sum, value) => sum + value, 0) / Object.values(stageScores).length
    );
    const decision = decide(score, blockingIssues);
    const rewriteStage = decision === "rewrite" ? pickRewriteStage(issues) : null;

    if (blockingIssues.length === 0 && score >= 80) {
      strengths.push("整体达到可继续预览和导出的质量线");
    }

    return {
      score,
      stageScores,
      issues,
      strengths,
      blockingIssues,
      suggestedFixes,
      decision,
      shouldRewrite: decision === "rewrite",
      rewriteStage
    };
  }
}
