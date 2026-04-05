import type { TemplateSchema } from "@/lib/templates/types";

export function pickTemplate(prompt: string, templates: TemplateSchema[]): TemplateSchema {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("团队") || lowerPrompt.includes("交付")) {
    return templates.find((template) => template.meta.id === "team-delivery") ?? templates[0];
  }

  if (
    lowerPrompt.includes("对比") ||
    lowerPrompt.includes("流程") ||
    lowerPrompt.includes("json") ||
    lowerPrompt.includes("命令行")
  ) {
    return templates.find((template) => template.meta.id === "feature-compare") ?? templates[0];
  }

  return templates.find((template) => template.meta.id === "cover-hero") ?? templates[0];
}
