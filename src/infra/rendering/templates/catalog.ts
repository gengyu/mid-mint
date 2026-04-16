import coverHeroSchema from "./cover-hero.schema.json";
import featureCompareSchema from "./feature-compare.schema.json";
import quoteCtaSchema from "./quote-cta.schema.json";
import stepListSchema from "./step-list.schema.json";
import storySplitSchema from "./story-split.schema.json";
import teamDeliverySchema from "./team-delivery.schema.json";
import tripleCardsSchema from "./triple-cards.schema.json";
import type { TemplateSchema } from "./types";
import { assertTemplateRouteMeta } from "@/core/domain/validation";

const catalogSchemas = [
  coverHeroSchema as TemplateSchema,
  featureCompareSchema as TemplateSchema,
  teamDeliverySchema as TemplateSchema,
  storySplitSchema as TemplateSchema,
  tripleCardsSchema as TemplateSchema,
  stepListSchema as TemplateSchema,
  quoteCtaSchema as TemplateSchema
];

export const TEMPLATE_CATALOG = catalogSchemas.map((template) => ({
  meta: {
    ...template.meta,
    routeMeta: assertTemplateRouteMeta(template.meta.routeMeta)
  }
}));
