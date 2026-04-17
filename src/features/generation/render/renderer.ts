import fs from "fs";
import path from "path";
import { Resvg } from "@resvg/resvg-js";
import { exportSvg } from "@/infra/rendering/svg/export-svg";
import { TEMPLATE_REGISTRY } from "@/infra/rendering/templates/registry";
import type { DeckPlan, DeckSlide, RenderResult, VisualSpec } from "@/core/domain/types";
import { ensureDir, projectPath } from "@/infra/utils/fs";
import { truncateText } from "@/infra/utils/text";

function toStorageUrl(filePath: string) {
  const relativePath = path.relative(projectPath("storage"), filePath).split(path.sep).join("/");
  return `/storage/${relativePath}`;
}

function createOutputDir(workflowId: string, versionNumber: number) {
  return ensureDir(projectPath("storage", "v1", "workflows", workflowId, `v${versionNumber}`));
}

function splitBody(body: string, count: number, maxLength: number) {
  const normalized = body.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return Array.from({ length: count }, () => "");
  }

  const segments = normalized
    .split(/[。！？；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
  const result: string[] = [];

  for (const segment of segments) {
    if (result.length >= count) {
      break;
    }
    result.push(truncateText(segment, maxLength));
  }

  while (result.length < count) {
    result.push("");
  }

  return result;
}

function shortBodyLines(body: string, count: number) {
  return splitBody(body, count, 10);
}

function slideValuesToTemplateValues(slide: DeckSlide, visualSpec: VisualSpec, deckCta: string) {
  const eyebrow = `0${slide.index}`;
  const subtitle = truncateText(slide.goal || slide.body, 28);
  const footer = truncateText(visualSpec.tone === "professional" ? "信息已结构化，可直接改稿" : "继续优化这页可提升转化", 32);
  const highlights = [...slide.highlights];
  const bodyLines = splitBody(slide.body, 6, 18);
  const compactBodyLines = shortBodyLines(slide.body, 12);

  switch (slide.templateId) {
    case "cover-hero":
      return {
        eyebrow,
        title: truncateText(slide.title, 22),
        subtitle,
        highlight: truncateText(slide.body, 34),
        featureA: truncateText(highlights[0] || "重点1", 8),
        featureADesc: truncateText(bodyLines[0] || slide.goal, 16),
        featureB: truncateText(highlights[1] || "重点2", 8),
        featureBDesc: truncateText(bodyLines[1] || slide.body, 16),
        featureC: truncateText(highlights[2] || "重点3", 8),
        featureCDesc: truncateText(bodyLines[2] || footer, 18)
      };
    case "step-list":
      return {
        eyebrow,
        title: truncateText(slide.title, 22),
        subtitle,
        step1: truncateText(highlights[0] || bodyLines[0] || slide.body, 20),
        step2: truncateText(highlights[1] || bodyLines[1] || slide.goal, 20),
        step3: truncateText(highlights[2] || bodyLines[2] || slide.body, 20),
        step4: truncateText(bodyLines[3] || "补充说明", 20),
        step5: truncateText(bodyLines[4] || "落地动作", 20),
        footer
      };
    case "story-split":
      return {
        eyebrow,
        title: truncateText(slide.title, 24),
        subtitle: truncateText(slide.body, 30),
        leftLabel: truncateText(highlights[0] || "现状", 8),
        leftTitle: truncateText(bodyLines[0] || slide.goal, 12),
        leftBody: truncateText(`${bodyLines[1]} ${bodyLines[2]}`.trim() || slide.body, 34),
        rightLabel: truncateText(highlights[1] || "变化", 8),
        rightTitle: truncateText(bodyLines[3] || "下一步", 12),
        rightBody: truncateText(`${bodyLines[4]} ${bodyLines[5]}`.trim() || footer, 34),
        footer
      };
    case "quote-cta":
      return {
        eyebrow: truncateText(visualSpec.visualFamily, 12),
        title: truncateText(slide.title, 24),
        subtitle: truncateText(slide.body, 28),
        button: truncateText(slide.highlights[0] || "继续改这版", 18),
        footer: truncateText(slide.goal || footer, 22)
      };
    case "team-delivery":
      return {
        eyebrow,
        title: truncateText(slide.title, 24),
        subtitle: truncateText(slide.body, 34),
        cardA: truncateText(highlights[0] || "角色一", 8),
        cardALine1: truncateText(compactBodyLines[0] || "信息对齐", 10),
        cardALine2: truncateText(compactBodyLines[1] || "步骤统一", 10),
        cardALine3: truncateText(compactBodyLines[2] || "减少返工", 10),
        cardB: truncateText(highlights[1] || "角色二", 8),
        cardBLine1: truncateText(compactBodyLines[3] || "入口固定", 10),
        cardBLine2: truncateText(compactBodyLines[4] || "状态可见", 10),
        cardBLine3: truncateText(compactBodyLines[5] || "协作更顺", 10),
        cardC: truncateText(highlights[2] || "角色三", 8),
        cardCLine1: truncateText(compactBodyLines[6] || "交付提效", 10),
        cardCLine2: truncateText(compactBodyLines[7] || "配置一致", 10),
        cardCLine3: truncateText(compactBodyLines[8] || "排查更快", 10),
        lead: truncateText(slide.goal, 18),
        bullet1: truncateText(compactBodyLines[9] || "统一说明入口", 20),
        bullet2: truncateText(compactBodyLines[10] || "减少重复沟通", 26),
        bullet3: truncateText(compactBodyLines[11] || "让交付更稳定", 30),
        footer: truncateText(deckCta || slide.goal || footer, 34)
      };
    case "triple-cards":
    default:
      return {
        eyebrow,
        title: truncateText(slide.title, 24),
        subtitle,
        cardA: truncateText(highlights[0] || "重点A", 8),
        cardAL1: truncateText(bodyLines[0], 10),
        cardAL2: truncateText(bodyLines[1], 10),
        cardAL3: truncateText(bodyLines[2], 10),
        cardB: truncateText(highlights[1] || "重点B", 8),
        cardBL1: truncateText(bodyLines[3] || slide.goal, 10),
        cardBL2: truncateText(bodyLines[4] || slide.body, 10),
        cardBL3: truncateText(bodyLines[5] || footer, 10),
        cardC: truncateText(highlights[2] || "重点C", 8),
        cardCL1: truncateText(slide.pageType, 10),
        cardCL2: truncateText(visualSpec.tone, 10),
        cardCL3: truncateText(visualSpec.layoutMode, 10),
        footer
      };
  }
}

function compactValues(values: Record<string, string | undefined>) {
  return Object.fromEntries(
    Object.entries(values).filter((entry): entry is [string, string] => typeof entry[1] === "string")
  );
}

function detectOverflow(slide: DeckSlide, templateId: string, values: Record<string, string>) {
  const template = TEMPLATE_REGISTRY.getById(templateId);
  if (!template) {
    return true;
  }

  const slotOverflow = template.slots.some((slot) => {
    const value = values[slot.id] || "";
    return value.length > slot.maxLength;
  });

  return slotOverflow || slide.charCountBody > 180 || slide.charCountTitle > 28;
}

function buildHtmlPreview(title: string, slides: Array<{ index: number; svg: string; overflowDetected: boolean }>) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 24px; background: #f4f4f5; font-family: "PingFang SC", "Microsoft YaHei", sans-serif; }
    .wrap { width: min(960px, 100%); margin: 0 auto; display: grid; gap: 24px; }
    .card { background: white; border-radius: 24px; padding: 16px; box-shadow: 0 20px 60px rgba(15,23,42,.08); }
    .badge { display: inline-block; margin-bottom: 12px; padding: 6px 10px; border-radius: 999px; background: #111827; color: white; font-size: 12px; }
    .warn { background: #f97316; }
    svg { display: block; width: 100%; height: auto; border-radius: 18px; }
  </style>
</head>
<body>
  <main class="wrap">
    ${slides
      .map(
        (slide) => `<section class="card">
          <span class="badge${slide.overflowDetected ? " warn" : ""}">Slide ${slide.index}${slide.overflowDetected ? " Overflow" : ""}</span>
          <div>${slide.svg}</div>
        </section>`
      )
      .join("")}
  </main>
</body>
</html>`;
}

export class Renderer {
  async render(input: {
    workflowId: string;
    versionNumber: number;
    deckPlan: DeckPlan;
    visualSpec: VisualSpec;
  }): Promise<RenderResult> {
    const outputDir = createOutputDir(input.workflowId, input.versionNumber);
    const renderedSlides = input.deckPlan.slides.map((slide) => {
      const template = TEMPLATE_REGISTRY.getById(slide.templateId);
      if (!template) {
        throw new Error(`Template not found: ${slide.templateId}`);
      }

      const values = compactValues({
        ...slide.values,
        ...slideValuesToTemplateValues(slide, input.visualSpec, input.deckPlan.cta)
      });
      const svg = exportSvg(template, values);
      const overflowDetected = detectOverflow(slide, slide.templateId, values);
      const svgPath = path.join(outputDir, `slide-${slide.index}.svg`);
      const pngPath = path.join(outputDir, `slide-${slide.index}.png`);
      const pngData = new Resvg(svg, {
        fitTo: {
          mode: "width",
          value: 1242
        }
      }).render().asPng();

      fs.writeFileSync(svgPath, svg, "utf8");
      fs.writeFileSync(pngPath, pngData);

      return {
        slideIndex: slide.index,
        svg,
        svgUrl: toStorageUrl(svgPath),
        pngUrl: toStorageUrl(pngPath),
        htmlFragment: svg,
        overflowDetected
      };
    });

    const htmlPath = path.join(outputDir, "slides.html");
    fs.writeFileSync(
      htmlPath,
      buildHtmlPreview(
        input.deckPlan.summary || "mid-mint preview",
        renderedSlides.map((slide) => ({
          index: slide.slideIndex,
          svg: slide.svg,
          overflowDetected: slide.overflowDetected
        }))
      ),
      "utf8"
    );

    return {
      assets: renderedSlides.map((slide) => ({
        slideIndex: slide.slideIndex,
        svgUrl: slide.svgUrl,
        pngUrl: slide.pngUrl,
        htmlFragment: slide.htmlFragment,
        overflowDetected: slide.overflowDetected
      })),
      htmlPreviewUrl: toStorageUrl(htmlPath),
      pngUrls: renderedSlides.map((slide) => slide.pngUrl),
      svgUrls: renderedSlides.map((slide) => slide.svgUrl)
    };
  }
}
