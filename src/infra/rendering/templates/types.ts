import type { TemplateRouteMeta } from "@/core/domain/types";

export type TemplateMeta = {
  id: string;
  name: string;
  category: string;
  description: string;
  supportedSlots: string[];
  tags?: string[];
  routeMeta: TemplateRouteMeta;
};

export type TemplateSlot = {
  id: string;
  type: "text";
  maxLength: number;
  maxLines: number;
  fontSize: number;
  minFontSize: number;
  lineHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  textAnchor?: "start" | "middle" | "end";
  fill?: string;
  fontWeight?: number;
};

export type TemplateSchema = {
  meta: TemplateMeta;
  svgFile: string;
  slots: TemplateSlot[];
};

export type GeneratedCopy = {
  templateId: string;
  values: Record<string, string>;
};

export type GenerateRequest = {
  prompt: string;
  templateId?: string;
  values?: Record<string, string>;
  generateBackground?: boolean;
};

export type GenerateResult = {
  templateId: string;
  values: Record<string, string>;
  svg: string;
  backgroundUrl?: string;
  backgroundPrompt?: string;
};
