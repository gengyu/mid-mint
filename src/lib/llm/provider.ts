import type { GenerateRequest, GeneratedCopy, TemplateSchema } from "@/lib/templates/types";

export interface LlmProvider {
  generateCopy(request: GenerateRequest, template: TemplateSchema): Promise<GeneratedCopy>;
}
