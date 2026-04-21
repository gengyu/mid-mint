import { Injectable } from '@nestjs/common';

import { LlmJsonService } from '../../llm/llm-json.service';
import { ParsedDocument } from '../../parser/types/parsed-document.type';
import { PresentationAnalysis } from '../pipeline.types';

@Injectable()
export class AnalyzeContentStep {
  constructor(private readonly llmJsonService: LlmJsonService) {}

  async run(document: ParsedDocument): Promise<PresentationAnalysis> {
    return this.llmJsonService.analyzeDocument(document);
  }
}
