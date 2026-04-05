import { LocalImageProvider } from "@/lib/image/local-image";
import { pickTemplate } from "@/lib/matcher/pick-template";
import { OpenAiProvider } from "@/lib/llm/openai";
import { exportSvg } from "@/lib/renderer/export-svg";
import { TEMPLATE_REGISTRY } from "@/lib/templates/registry";
import type { GenerateRequest, GenerateResult } from "@/lib/templates/types";
import { MidMintError } from "@/lib/utils/errors";

export async function generatePoster(request: GenerateRequest): Promise<GenerateResult> {
  if (!request.prompt?.trim()) {
    throw new MidMintError("Prompt is required.");
  }

  const allTemplates = TEMPLATE_REGISTRY.list();
  const templateSchema = request.templateId
    ? TEMPLATE_REGISTRY.getById(request.templateId)
    : TEMPLATE_REGISTRY.getById(pickTemplate(request.prompt, allTemplates).meta.id);

  if (!templateSchema) {
    throw new MidMintError("Template not found.");
  }

  const copy = request.values
    ? {
        templateId: templateSchema.meta.id,
        values: request.values
      }
    : await new OpenAiProvider().generateCopy(request, templateSchema);
  const background =
    request.generateBackground === false
      ? undefined
      : await new LocalImageProvider().generateBackground(request.prompt, templateSchema);
  const svg = exportSvg(templateSchema, copy.values, {
    backgroundUrl: background?.url
  });

  return {
    templateId: templateSchema.meta.id,
    values: copy.values,
    svg,
    backgroundUrl: background?.url,
    backgroundPrompt: background?.prompt
  };
}
