import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import type { TemplateSchema } from "@/lib/templates/types";
import { assertContentSignals } from "@/modules/domain/validation";
import type {
  AudienceMode,
  ContentAngle,
  ContentBrief,
  ContentSignals,
  ContentIntent,
  DeckPlan,
  DeckSlide,
  DensityLevel,
  ImageStrategy,
  LayoutMode,
  ParsedSource,
  RouteReasonCode,
  ThemeCategory,
  ToneMode,
  VisualFamily,
  VisualSpec
} from "@/modules/domain/types";
import { AppValidationError, createAppError } from "@/shared/errors/app-error";

type BaseRoute = {
  themeCategory: ThemeCategory;
  contentIntent: ContentIntent;
  visualFamily: VisualFamily;
};

type FamilyVisualTokens = {
  tone: ToneMode;
  paletteKey: string;
  typographyMode: string;
  decorationLevel: "low" | "medium" | "high";
  imageStrategy: ImageStrategy;
};

type SlideRouteResult = {
  templateId: string;
  overflowRisk: number;
  warnings: string[];
};

type DeckRouteResult = {
  slides: DeckSlide[];
  warnings: string[];
  overflowRisk: number;
};

const BASE_ROUTE_BY_ANGLE: Record<ContentAngle, BaseRoute> = {
  quick_view: { themeCategory: "news_flash", contentIntent: "inform", visualFamily: "signal-tech" },
  key_points: { themeCategory: "knowledge_explainer", contentIntent: "explain", visualFamily: "clean-method" },
  industry_impact: { themeCategory: "news_flash", contentIntent: "explain", visualFamily: "signal-tech" },
  practitioner_view: { themeCategory: "case_story", contentIntent: "convince", visualFamily: "warm-story" },
  product_opportunity: { themeCategory: "campaign_launch", contentIntent: "convert", visualFamily: "brand-campaign" },
  tool_summary: { themeCategory: "comparison_analysis", contentIntent: "compare", visualFamily: "proof-compare" },
  pitfall_alert: { themeCategory: "news_flash", contentIntent: "convince", visualFamily: "signal-tech" },
  experience_breakdown: { themeCategory: "case_story", contentIntent: "explain", visualFamily: "warm-story" },
  method_summary: { themeCategory: "method_guide", contentIntent: "explain", visualFamily: "clean-method" }
};

const FAMILY_TOKENS: Record<VisualFamily, FamilyVisualTokens> = {
  "signal-tech": {
    tone: "sharp",
    paletteKey: "tech-emerald",
    typographyMode: "display-sharp",
    decorationLevel: "medium",
    imageStrategy: "abstract"
  },
  "clean-method": {
    tone: "practical",
    paletteKey: "paper-slate",
    typographyMode: "sans-clean",
    decorationLevel: "low",
    imageStrategy: "none"
  },
  "proof-compare": {
    tone: "professional",
    paletteKey: "contrast-copper",
    typographyMode: "sans-compact",
    decorationLevel: "medium",
    imageStrategy: "abstract"
  },
  "warm-story": {
    tone: "warm",
    paletteKey: "sunset-ink",
    typographyMode: "serif-warm",
    decorationLevel: "medium",
    imageStrategy: "editorial"
  },
  "brand-campaign": {
    tone: "energetic",
    paletteKey: "brand-pop",
    typographyMode: "display-bold",
    decorationLevel: "high",
    imageStrategy: "editorial"
  }
};

const FAMILY_HINTS: Array<{ family: VisualFamily; keywords: string[] }> = [
  { family: "signal-tech", keywords: ["科技", "tech", "未来", "signal"] },
  { family: "clean-method", keywords: ["极简", "clean", "minimal", "方法"] },
  { family: "proof-compare", keywords: ["对比", "compare", "理性", "proof"] },
  { family: "warm-story", keywords: ["温和", "故事", "warm", "narrative"] },
  { family: "brand-campaign", keywords: ["品牌", "campaign", "发布", "emotional"] }
];

const TONE_HINTS: Array<{ tone: ToneMode; keywords: string[] }> = [
  { tone: "professional", keywords: ["专业", "professional"] },
  { tone: "sharp", keywords: ["锐利", "sharp"] },
  { tone: "warm", keywords: ["温和", "warm"] },
  { tone: "practical", keywords: ["务实", "practical"] },
  { tone: "energetic", keywords: ["活力", "energetic"] }
];

function inferDensityLevel(deckPlan: DeckPlan): DensityLevel {
  const totalChars = deckPlan.slides.reduce(
    (sum, slide) => sum + slide.charCountTitle + slide.charCountBody + slide.highlights.join("").length,
    0
  );
  const avgChars = totalChars / Math.max(1, deckPlan.slides.length);

  if (avgChars >= 140) {
    return "high";
  }
  if (avgChars >= 85) {
    return "medium";
  }

  return "low";
}

function inferLayoutMode(densityLevel: DensityLevel): LayoutMode {
  if (densityLevel === "low") {
    return "airy";
  }
  if (densityLevel === "high") {
    return "compact";
  }

  return "balanced";
}

function inferDensityReason(densityLevel: DensityLevel): RouteReasonCode {
  if (densityLevel === "low") {
    return "density_low_layout_airy";
  }
  if (densityLevel === "high") {
    return "density_high_layout_compact";
  }

  return "density_medium_layout_balanced";
}

function inferAudienceMode(audience: string): AudienceMode {
  const value = audience.toLowerCase();

  if (["创始人", "founder", "团队", "team"].some((keyword) => value.includes(keyword.toLowerCase()))) {
    return "founder_team";
  }
  if (["运营", "增长", "operator", "growth"].some((keyword) => value.includes(keyword.toLowerCase()))) {
    return "operator";
  }
  if (["专业", "研究", "engineer", "research", "开发", "product"].some((keyword) => value.includes(keyword.toLowerCase()))) {
    return "professional";
  }

  return "broad_consumer";
}

function audienceReason(mode: AudienceMode): RouteReasonCode {
  switch (mode) {
    case "founder_team":
      return "audience_mode_founder_team";
    case "operator":
      return "audience_mode_operator";
    case "professional":
      return "audience_mode_professional";
    default:
      return "audience_mode_broad_consumer";
  }
}

function matchFamilyHint(preferredStyle: string): VisualFamily | null {
  const value = preferredStyle.toLowerCase();
  const matched = FAMILY_HINTS.find((item) => item.keywords.some((keyword) => value.includes(keyword.toLowerCase())));
  return matched?.family ?? null;
}

function matchToneHint(preferredStyle: string): ToneMode | null {
  const value = preferredStyle.toLowerCase();
  const matched = TONE_HINTS.find((item) => item.keywords.some((keyword) => value.includes(keyword.toLowerCase())));
  return matched?.tone ?? null;
}

function collectWarnings(deckPlan: DeckPlan, densityLevel: DensityLevel) {
  const warnings: string[] = [];

  if (densityLevel === "high") {
    warnings.push("overall_content_density_high");
  }

  for (const slide of deckPlan.slides) {
    if (slide.charCountTitle > 22) {
      warnings.push(`slide_${slide.index}_title_may_overflow`);
    }
    if (slide.charCountBody > 120) {
      warnings.push(`slide_${slide.index}_body_may_overflow`);
    }
    if (slide.highlights.some((item) => item.length > 18)) {
      warnings.push(`slide_${slide.index}_highlight_too_long`);
    }
  }

  return warnings;
}

function sortTemplates(templates: TemplateSchema[]) {
  return [...templates].sort((left, right) => {
    const priorityDiff = right.meta.routeMeta.usagePriority - left.meta.routeMeta.usagePriority;
    return priorityDiff !== 0 ? priorityDiff : left.meta.id.localeCompare(right.meta.id);
  });
}

function listEnabledTemplatesForPage(pageType: DeckSlide["pageType"]) {
  const templates = TEMPLATE_REGISTRY
    .list()
    .filter(
      (template) =>
        template.meta.routeMeta.phase1Status === "enabled" &&
        template.meta.routeMeta.supportedPageTypes.includes(pageType)
    );

  if (!templates.length) {
    throw new AppValidationError(
      createAppError("VISUAL_TEMPLATE_NOT_FOUND", `No Phase 1 template available for page type ${pageType}.`)
    );
  }

  return sortTemplates(templates);
}

function estimateSlideOverflowRisk(slide: DeckSlide, template: TemplateSchema) {
  const slotCapacity = template.slots.reduce((sum, slot) => sum + slot.maxLength * slot.maxLines, 0);
  const contentSize = slide.charCountTitle + slide.charCountBody + slide.highlights.join("").length;
  const overflowByCapacity = contentSize > slotCapacity ? 2 : 0;
  const overflowByBody = slide.charCountBody > 160 ? 2 : slide.charCountBody > 120 ? 1 : 0;
  const overflowByTitle = slide.charCountTitle > 24 ? 1 : 0;
  return overflowByCapacity + overflowByBody + overflowByTitle;
}

function resolveSlideTemplate(
  slide: DeckSlide,
  context: { visualFamily: VisualFamily; themeCategory: ThemeCategory; densityLevel: DensityLevel }
): SlideRouteResult {
  const baseCandidates = listEnabledTemplatesForPage(slide.pageType);

  const familyMatches = baseCandidates.filter((template) =>
    template.meta.routeMeta.supportedFamilies.includes(context.visualFamily)
  );
  const themeMatches = familyMatches.filter((template) =>
    template.meta.routeMeta.supportedThemes.includes(context.themeCategory)
  );
  const densityMatches = themeMatches.filter((template) =>
    template.meta.routeMeta.densitySupport.includes(context.densityLevel)
  );

  if (densityMatches.length) {
    const selected = densityMatches[0];
    return {
      templateId: selected.meta.id,
      warnings: [],
      overflowRisk: estimateSlideOverflowRisk(slide, selected)
    };
  }

  const familyFallbackMatches = baseCandidates.filter(
    (template) =>
      template.meta.routeMeta.supportedThemes.includes(context.themeCategory) &&
      template.meta.routeMeta.densitySupport.includes(context.densityLevel)
  );
  if (familyFallbackMatches.length) {
    const selected = familyFallbackMatches[0];
    return {
      templateId: selected.meta.id,
      warnings: ["template_family_fallback"],
      overflowRisk: estimateSlideOverflowRisk(slide, selected) + 1
    };
  }

  const themeFallbackMatches = baseCandidates.filter((template) =>
    template.meta.routeMeta.densitySupport.includes(context.densityLevel)
  );
  if (themeFallbackMatches.length) {
    const selected = themeFallbackMatches[0];
    return {
      templateId: selected.meta.id,
      warnings: ["template_family_fallback", "template_theme_fallback"],
      overflowRisk: estimateSlideOverflowRisk(slide, selected) + 2
    };
  }

  if (baseCandidates.length) {
    const selected = baseCandidates[0];
    return {
      templateId: selected.meta.id,
      warnings: ["template_family_fallback", "template_theme_fallback", "template_density_fallback"],
      overflowRisk: estimateSlideOverflowRisk(slide, selected) + 3
    };
  }

  throw new AppValidationError(
    createAppError("VISUAL_TEMPLATE_NOT_FOUND", `Template could not be resolved for slide ${slide.index}.`)
  );
}

function resolveDeckTemplates(
  deckPlan: DeckPlan,
  context: { visualFamily: VisualFamily; themeCategory: ThemeCategory; densityLevel: DensityLevel }
): DeckRouteResult {
  const warnings: string[] = [];
  let overflowRisk = 0;

  const slides = deckPlan.slides.map((slide) => {
    const resolved = resolveSlideTemplate(slide, context);
    warnings.push(...resolved.warnings);
    overflowRisk += resolved.overflowRisk;
    return {
      ...slide,
      templateId: resolved.templateId
    };
  });

  return {
    slides,
    warnings,
    overflowRisk
  };
}

function familyHasPageTypeCoverage(deckPlan: DeckPlan, family: VisualFamily) {
  return deckPlan.slides.every((slide) =>
    TEMPLATE_REGISTRY.list().some(
      (template) =>
        template.meta.routeMeta.phase1Status === "enabled" &&
        template.meta.routeMeta.supportedPageTypes.includes(slide.pageType) &&
        template.meta.routeMeta.supportedFamilies.includes(family)
    )
  );
}

function deriveSignals(contentBrief: ContentBrief, deckPlan: DeckPlan, preferredStyle: string): ContentSignals {
  const baseRoute = BASE_ROUTE_BY_ANGLE[contentBrief.angle];
  if (!baseRoute) {
    throw new AppValidationError(createAppError("VISUAL_ROUTE_UNRESOLVED", "Visual base route could not be derived."));
  }

  const densityLevel = inferDensityLevel(deckPlan);
  const audienceMode = inferAudienceMode(contentBrief.audience);
  const familyTokens = FAMILY_TOKENS[baseRoute.visualFamily];
  if (!familyTokens) {
    throw new AppValidationError(createAppError("VISUAL_ROUTE_UNRESOLVED", "Visual family tokens are missing."));
  }

  return assertContentSignals({
    themeCategory: baseRoute.themeCategory,
    tone: matchToneHint(preferredStyle) ?? familyTokens.tone,
    densityLevel,
    contentIntent: baseRoute.contentIntent,
    audienceMode
  });
}

export class VisualMatch {
  async run(input: {
    parsedSource: ParsedSource;
    contentBrief: ContentBrief;
    deckPlan: DeckPlan;
    preferredStyle: string;
  }): Promise<{ deckPlan: DeckPlan; visualSpec: VisualSpec }> {
    void input.parsedSource;

    const baseRoute = BASE_ROUTE_BY_ANGLE[input.contentBrief.angle];
    if (!baseRoute) {
      throw new AppValidationError(createAppError("VISUAL_ROUTE_UNRESOLVED", "Visual route cannot be resolved."));
    }

    const signals = deriveSignals(input.contentBrief, input.deckPlan, input.preferredStyle);
    const baseDeckRoute = resolveDeckTemplates(input.deckPlan, {
      visualFamily: baseRoute.visualFamily,
      themeCategory: signals.themeCategory,
      densityLevel: signals.densityLevel
    });

    const hintedFamily = matchFamilyHint(input.preferredStyle);
    let visualFamily = baseRoute.visualFamily;
    let styleReason: RouteReasonCode | null = null;
    let selectedDeckRoute = baseDeckRoute;

    if (hintedFamily && hintedFamily !== baseRoute.visualFamily) {
      if (familyHasPageTypeCoverage(input.deckPlan, hintedFamily)) {
        const hintedDeckRoute = resolveDeckTemplates(input.deckPlan, {
          visualFamily: hintedFamily,
          themeCategory: signals.themeCategory,
          densityLevel: signals.densityLevel
        });

        if (hintedDeckRoute.overflowRisk <= baseDeckRoute.overflowRisk) {
          visualFamily = hintedFamily;
          selectedDeckRoute = hintedDeckRoute;
          styleReason = "preferred_style_hint_applied";
        } else {
          styleReason = "preferred_style_hint_ignored";
        }
      } else {
        styleReason = "preferred_style_hint_ignored";
      }
    }

    const familyTokens = FAMILY_TOKENS[visualFamily];
    if (!familyTokens) {
      throw new AppValidationError(createAppError("VISUAL_ROUTE_UNRESOLVED", "Resolved visual family is invalid."));
    }

    const layoutMode = inferLayoutMode(signals.densityLevel);
    const routeReasons = [
      "angle_selected_base_route",
      audienceReason(signals.audienceMode),
      inferDensityReason(signals.densityLevel),
      styleReason
    ].filter((reason): reason is RouteReasonCode => reason !== null);

    return {
      deckPlan: {
        ...input.deckPlan,
        slides: selectedDeckRoute.slides
      },
      visualSpec: {
        routeId: `vf-${visualFamily}-${signals.themeCategory}-${signals.densityLevel}`,
        themeCategory: signals.themeCategory,
        visualFamily,
        tone: matchToneHint(input.preferredStyle) ?? familyTokens.tone,
        densityLevel: signals.densityLevel,
        layoutMode,
        paletteKey: familyTokens.paletteKey,
        typographyMode: familyTokens.typographyMode,
        decorationLevel: familyTokens.decorationLevel,
        imageStrategy: familyTokens.imageStrategy,
        routeReasons,
        warnings: [...new Set([...collectWarnings(input.deckPlan, signals.densityLevel), ...selectedDeckRoute.warnings])]
      }
    };
  }
}
