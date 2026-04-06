export type XhsDeckRequest = {
  prompt: string;
  topic?: string;
  slideCount?: 4 | 5;
  sourceText?: string;
  keyPoints?: string[];
  audience?: string;
  intent?: string;
};

export type XhsSlideTemplateId =
  | "cover-hero"
  | "feature-compare"
  | "step-list"
  | "triple-cards"
  | "story-split"
  | "team-delivery"
  | "quote-cta";

export type XhsSlide = {
  id: string;
  index: number;
  templateId: XhsSlideTemplateId;
  values: Record<string, string>;
  svg: string;
};

export type XhsLogEntry = {
  stage: string;
  status: "start" | "success" | "error" | "fallback" | "skipped";
  message: string;
  durationMs?: number;
};

export type XhsDeckResult = {
  prompt: string;
  topic: string;
  slideCount: number;
  summary: string;
  slides: XhsSlide[];
  outputDir: string;
  htmlPath: string;
  createdAt: string;
  logs: XhsLogEntry[];
};

export type XhsDeckHistoryEntry = {
  id: string;
  kind: "deck";
  prompt: string;
  topic: string;
  slideCount: number;
  summary: string;
  slides: Array<Pick<XhsSlide, "id" | "index" | "templateId" | "values" | "svg">>;
  outputDir: string;
  htmlPath: string;
  createdAt: string;
  logs: XhsLogEntry[];
};
