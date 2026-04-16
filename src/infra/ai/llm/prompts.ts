import type { TemplateSchema } from "@/infra/rendering/templates/types";

export function buildCopyPrompt(userPrompt: string, template: TemplateSchema) {
  return `
你是一个小红书营销文案助手。请根据给定主题，为 SVG 模板生成 JSON 文案。

主题：
${userPrompt}

模板：
${template.meta.name}

槽位要求：
${template.slots
  .map(
    (slot) =>
      `- ${slot.id}: maxLength=${slot.maxLength}, maxLines=${slot.maxLines}, 用中文，避免冗长。`
  )
  .join("\n")}

输出格式：
{
  "templateId": "${template.meta.id}",
  "values": {
    "slotId": "文案"
  }
}

只输出合法 JSON，不要输出 markdown。
`.trim();
}
