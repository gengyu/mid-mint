import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { buildBackgroundPrompt } from "./prompts";
import { createFallbackBackground } from "./fallback-background";
import type { TemplateSchema } from "@/lib/templates/types";
import { createId } from "@/lib/utils/id";
import { ensureDir, projectPath } from "@/lib/utils/fs";

export type BackgroundAsset = {
  url: string;
  prompt: string;
};

export class LocalImageProvider {
  private client: OpenAI | null;
  private model: string;

  constructor() {
    const baseURL = process.env.LOCAL_IMAGE_BASE_URL || "http://127.0.0.1:1234/v1";
    const apiKey = process.env.LOCAL_IMAGE_API_KEY || "local";
    this.model = process.env.LOCAL_IMAGE_MODEL || "local-image-model";

    this.client = new OpenAI({
      apiKey,
      baseURL
    });
  }

  async generateBackground(prompt: string, template: TemplateSchema): Promise<BackgroundAsset> {
    const finalPrompt = buildBackgroundPrompt(prompt, template.meta.name);
    const outputDir = ensureDir(projectPath("public", "generated-backgrounds"));

    try {
      const response = await this.client!.images.generate({
        model: this.model,
        prompt: finalPrompt,
        size: "1024x1536"
      });

      const encodedImage = response.data?.[0]?.b64_json;
      if (!encodedImage) {
        return createFallbackBackground(finalPrompt);
      }

      const fileName = `${createId("bg")}.png`;
      fs.writeFileSync(path.join(outputDir, fileName), Buffer.from(encodedImage, "base64"));
      return {
        url: `/generated-backgrounds/${fileName}`,
        prompt: finalPrompt
      };
    } catch {
      return createFallbackBackground(finalPrompt);
    }
  }
}
