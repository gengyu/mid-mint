import type { ContentBrief, DeckPlan, ParsedSource } from "@/modules/domain/types";
import { buildDeckPlan } from "./deck-utils";

export class DeckGenerator {
  async run(input: { parsedSource: ParsedSource; contentBrief: ContentBrief }): Promise<DeckPlan> {
    return buildDeckPlan(input.parsedSource, input.contentBrief);
  }
}
