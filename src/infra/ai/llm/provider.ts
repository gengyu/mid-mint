import type { GenerateRequest, GeneratedCopy, TemplateSchema } from "@/infra/rendering/templates/types";
import type { StructuredLlmResponse } from "@/application/jobs/stage-execution";

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
