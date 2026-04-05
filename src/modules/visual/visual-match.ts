import type { DeckPageType, DeckPlan, DensityLevel, VisualSpec } from "@/modules/domain/types";

const templateMap: Record<DeckPageType, string[]> = {
  cover: ["cover-hero"],
  summary: ["step-list", "story-split"],
  detail: ["triple-cards", "story-split"],
  comparison: ["story-split", "triple-cards"],
  checklist: ["step-list"],
  cta: ["quote-cta"]
};

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

function inferStyleName(preferredStyle: string) {
  const value = preferredStyle.trim().toLowerCase();
  if (!value) {
    return "balanced-editorial";
  }
  if (value.includes("极简") || value.includes("minimal")) {
    return "minimal-clean";
  }
  if (value.includes("科技") || value.includes("tech")) {
    return "tech-sharp";
  }
  if (value.includes("温和") || value.includes("warm")) {
    return "warm-friendly";
  }

  return value.replace(/\s+/g, "-").slice(0, 32);
}

function inferTone(preferredStyle: string, densityLevel: DensityLevel) {
  if (preferredStyle.includes("专业") || preferredStyle.includes("research")) {
    return "professional";
  }
  if (densityLevel === "high") {
    return "dense-informative";
  }
  return "informative";
}

function inferLayoutMode(densityLevel: DensityLevel) {
  if (densityLevel === "high") {
    return "compact";
  }
  if (densityLevel === "low") {
    return "airy";
  }
  return "balanced";
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

  return [...new Set(warnings)];
}

function resolveTemplateId(pageType: DeckPageType, currentTemplateId: string, densityLevel: DensityLevel) {
  const candidates = templateMap[pageType];
  if (currentTemplateId && candidates.includes(currentTemplateId)) {
    return currentTemplateId;
  }

  if (pageType === "detail" && densityLevel === "high") {
    return "story-split";
  }

  return candidates[0];
}

export class VisualMatch {
  async run(input: { deckPlan: DeckPlan; preferredStyle: string }): Promise<{ deckPlan: DeckPlan; visualSpec: VisualSpec }> {
    const densityLevel = inferDensityLevel(input.deckPlan);
    const warnings = collectWarnings(input.deckPlan, densityLevel);

    return {
      deckPlan: {
        ...input.deckPlan,
        slides: input.deckPlan.slides.map((slide) => ({
          ...slide,
          templateId: resolveTemplateId(slide.pageType, slide.templateId, densityLevel)
        }))
      },
      visualSpec: {
        styleName: inferStyleName(input.preferredStyle),
        layoutMode: inferLayoutMode(densityLevel),
        tone: inferTone(input.preferredStyle, densityLevel),
        densityLevel,
        warnings
      }
    };
  }
}
