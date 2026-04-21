import { Injectable } from '@nestjs/common';

import { ParsedDocument } from '../../parser/types/parsed-document.type';
import { SlideSpecService } from '../../slides/slide-spec.service';
import { SlideSpec } from '../../slides/slide.types';
import { DeckPlan, PresentationAnalysis } from '../pipeline.types';

@Injectable()
export class WriteSlidesStep {
  constructor(private readonly slideSpecService: SlideSpecService) {}

  run(
    document: ParsedDocument,
    analysis: PresentationAnalysis,
    deckPlan: DeckPlan,
  ): SlideSpec[] {
    return this.slideSpecService.createSlides(document, analysis, deckPlan);
  }
}
