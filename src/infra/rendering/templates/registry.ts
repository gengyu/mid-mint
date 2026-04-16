import fs from "fs";
import path from "path";
import coverHeroSchema from "./cover-hero.schema.json";
import featureCompareSchema from "./feature-compare.schema.json";
import quoteCtaSchema from "./quote-cta.schema.json";
import stepListSchema from "./step-list.schema.json";
import storySplitSchema from "./story-split.schema.json";
import teamDeliverySchema from "./team-delivery.schema.json";
import tripleCardsSchema from "./triple-cards.schema.json";
import type { TemplateSchema } from "./types";
import { assertTemplateRouteMeta } from "@/core/domain/validation";

export const TEMPLATE_SCHEMAS = [
  coverHeroSchema as TemplateSchema,
  featureCompareSchema as TemplateSchema,
  teamDeliverySchema as TemplateSchema,
  storySplitSchema as TemplateSchema,
  tripleCardsSchema as TemplateSchema,
  stepListSchema as TemplateSchema,
  quoteCtaSchema as TemplateSchema
].map((schema) => ({
  ...schema,
  meta: {
    ...schema.meta,
    routeMeta: assertTemplateRouteMeta(schema.meta.routeMeta)
  }
}));

function templateDir() {
  return path.join(process.cwd(), "src", "lib", "templates");
}

function withSvgContent(schema: TemplateSchema) {
  const svgPath = path.join(templateDir(), schema.svgFile);
  const svg = fs.readFileSync(svgPath, "utf8");
  return {
    ...schema,
    svg
  };
}

export const TEMPLATE_REGISTRY = {
  list() {
    return TEMPLATE_SCHEMAS;
  },
  getById(id: string) {
    const schema = TEMPLATE_SCHEMAS.find((item) => item.meta.id === id);
    return schema ? withSvgContent(schema) : null;
  },
  listWithSvg() {
    return TEMPLATE_SCHEMAS.map(withSvgContent);
  }
};
