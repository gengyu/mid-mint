import fs from "fs";
import path from "path";
import type { XhsSlide, XhsLogEntry } from "@/platforms/xiaohongshu/types";
import { ensureDir, projectPath } from "@/infra/utils/fs";

type SaveDeckBundleInput = {
  prompt: string;
  topic: string;
  slideCount: number;
  summary: string;
  slides: XhsSlide[];
  createdAt: string;
  logs?: XhsLogEntry[];
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function saveDeckBundle(result: SaveDeckBundleInput) {
  const date = new Date(result.createdAt).toISOString().slice(0, 10);
  const folderName = `${date}-${slugify(result.topic || result.prompt || "xiaohongshu-deck")}`;
  const outputDir = ensureDir(projectPath("storage", "xiaohongshu", folderName));

  result.slides.forEach((slide) => {
    fs.writeFileSync(path.join(outputDir, `slide-${slide.index}.svg`), slide.svg, "utf8");
  });

  const htmlPath = path.join(outputDir, "slides.html");
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(result.topic)} 小红书图文</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #f3f4f6;
      color: #111827;
      font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      display: flex;
      flex-direction: column;
      gap: 24px;
      align-items: center;
    }
    .meta {
      width: min(960px, 100%);
      padding: 20px 24px;
      border-radius: 24px;
      background: white;
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.08);
    }
    .slides {
      display: flex;
      flex-direction: column;
      gap: 24px;
      width: 100%;
      align-items: center;
    }
    .slide {
      width: min(100%, 720px);
      background: white;
      border-radius: 28px;
      padding: 16px;
      box-shadow: 0 24px 64px rgba(15, 23, 42, 0.12);
    }
    .slide svg {
      width: 100%;
      height: auto;
      display: block;
      border-radius: 22px;
    }
  </style>
</head>
<body>
  <section class="meta">
    <h1>${escapeHtml(result.topic)}</h1>
    <p>${escapeHtml(result.summary)}</p>
  </section>
  <section class="slides">
    ${result.slides
      .map(
        (slide) =>
          `<article class="slide"><div>${slide.svg}</div></article>`
      )
      .join("")}
  </section>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html, "utf8");

  fs.writeFileSync(
    path.join(outputDir, "deck.json"),
    JSON.stringify(
      {
        prompt: result.prompt,
        topic: result.topic,
        slideCount: result.slideCount,
        summary: result.summary,
        createdAt: result.createdAt,
        logs: result.logs ?? [],
        slides: result.slides.map((slide) => ({
          id: slide.id,
          index: slide.index,
          templateId: slide.templateId,
          values: slide.values,
          fileName: `slide-${slide.index}.svg`
        }))
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    outputDir,
    htmlPath
  };
}
