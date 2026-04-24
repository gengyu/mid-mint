import { Module } from '@nestjs/common';

import { DesignModule } from '../design/design.module';
import { LlmModule } from '../llm/llm.module';
import { ParserModule } from '../parser/parser.module';
import { PptDslModule } from '../ppt-dsl/ppt-dsl.module';
import { RendererModule } from '../renderer/renderer.module';
import { SlidesModule } from '../slides/slides.module';
import { StorageModule } from '../storage/storage.module';
import { VisualsModule } from '../visuals/visuals.module';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [
    ParserModule,
    LlmModule,
    PptDslModule,
    DesignModule,
    SlidesModule,
    VisualsModule,
    RendererModule,
    StorageModule,
  ],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
