import { Injectable } from '@nestjs/common';

import { LlmJsonService } from '../../llm/llm-json.service';
import { ParsedDocument } from '../../parser/types/parsed-document.type';
import { DeckPlan, PresentationAnalysis } from '../pipeline.types';

@Injectable()
export class PlanDeckStep {
  constructor(private readonly llmJsonService: LlmJsonService) {}

  async run(
    document: ParsedDocument,
    analysis: PresentationAnalysis,
    requestedSlides?: number,
  ): Promise<DeckPlan> {
    return this.llmJsonService.planDeck(document, analysis, requestedSlides);
  }
}
