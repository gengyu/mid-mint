import { Module } from '@nestjs/common';

import { LlmModule } from '../llm/llm.module';
import { ParserModule } from '../parser/parser.module';
import { RendererModule } from '../renderer/renderer.module';
import { SlidesModule } from '../slides/slides.module';
import { StorageModule } from '../storage/storage.module';
import { VisualsModule } from '../visuals/visuals.module';
import { PipelineService } from './pipeline.service';
import { AnalyzeContentStep } from './steps/analyze-content.step';
import { GenerateAssetsStep } from './steps/generate-assets.step';
import { ParseDocumentStep } from './steps/parse-document.step';
import { PlanDeckStep } from './steps/plan-deck.step';
import { RenderPptxStep } from './steps/render-pptx.step';
import { WriteSlidesStep } from './steps/write-slides.step';

@Module({
  imports: [ParserModule, LlmModule, SlidesModule, VisualsModule, RendererModule, StorageModule],
  providers: [
    PipelineService,
    ParseDocumentStep,
    AnalyzeContentStep,
    PlanDeckStep,
    WriteSlidesStep,
    GenerateAssetsStep,
    RenderPptxStep,
  ],
  exports: [PipelineService],
})
export class PipelineModule {}
