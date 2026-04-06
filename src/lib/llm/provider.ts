import type { GenerateRequest, GeneratedCopy, TemplateSchema } from "@/lib/templates/types";
import type { StructuredLlmResponse } from "@/modules/workflow/stage-execution";

export interface LlmProvider {
  generateCopy(request: GenerateRequest, template: TemplateSchema): Promise<GeneratedCopy>;
  generateStructuredText(
    prompt: string,
    options?: {
      timeoutMs?: number;
    }
  ): Promise<StructuredLlmResponse>;
  getDefaultModel(): string | null;
}
