import fs from "fs";
import path from "path";
import { createId } from "@/lib/utils/id";
import { ensureDir, projectPath } from "@/lib/utils/fs";

type BackgroundAsset = {
  url: string;
  prompt: string;
};

function hashText(input: string) {
  return Array.from(input).reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

export function createFallbackBackground(prompt: string): BackgroundAsset {
  const backgroundsDir = ensureDir(projectPath("public", "generated-backgrounds"));
  const hueSeed = hashText(prompt);
  const angle = hueSeed % 360;
  const accentX = 180 + (hueSeed % 420);
  const accentY = 180 + (hueSeed % 520);
  const fileName = `${createId("bg")}.svg`;
  const filePath = path.join(backgroundsDir, fileName);
  const svg = `<svg width="1242" height="1660" viewBox="0 0 1242 1660" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1242" height="1660" fill="url(#bg)"/>
  <circle cx="${accentX}" cy="${accentY}" r="240" fill="rgba(126,241,224,0.28)"/>
  <circle cx="${1040 - (hueSeed % 180)}" cy="${1320 - (hueSeed % 240)}" r="290" fill="rgba(255,107,61,0.18)"/>
  <path d="M0 1280C210 ${1100 + (hueSeed % 120)} 372 ${1420 + (hueSeed % 80)} 632 1360C862 ${1300 +
    (hueSeed % 120)} 1012 1150 1242 1228V1660H0V1280Z" fill="rgba(255,248,239,0.09)"/>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1242" y2="1660" gradientUnits="userSpaceOnUse" gradientTransform="rotate(${angle} 621 830)">
      <stop stop-color="#0D252D"/>
      <stop offset="0.55" stop-color="#173845"/>
      <stop offset="1" stop-color="#13313B"/>
    </linearGradient>
  </defs>
</svg>`;
  fs.writeFileSync(filePath, svg, "utf8");

  return {
    url: `/generated-backgrounds/${fileName}`,
    prompt
  };
}
