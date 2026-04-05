import fs from "node:fs";
import path from "node:path";
import { xiaohongshuCampaigns } from "@/data/xiaohongshu";
import { generatePoster } from "@/lib/pipeline/generate-poster";

async function main() {
  const outputDir = path.join(process.cwd(), "marketing", "xiaohongshu", "assets");
  const manifest: Array<{
    campaignId: string;
    campaignName: string;
    note: string;
    fileName: string;
    templateId: string;
    prompt: string;
  }> = [];

  for (const campaign of xiaohongshuCampaigns) {
    for (const page of campaign.pages) {
      const result = await generatePoster({
        prompt: page.prompt,
        templateId: page.templateId,
        values: page.values,
        generateBackground: false
      });
      const filePath = path.join(outputDir, page.fileName);
      fs.writeFileSync(filePath, result.svg, "utf8");
      manifest.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        note: campaign.note,
        fileName: page.fileName,
        templateId: page.templateId,
        prompt: page.prompt
      });
      console.log(`generated ${page.fileName}`);
    }
  }

  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
