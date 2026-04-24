import { Module } from '@nestjs/common';

import { DesignModule } from './modules/design/design.module';
import { LlmModule } from './modules/llm/llm.module';
import { ParserModule } from './modules/parser/parser.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { PptDslModule } from './modules/ppt-dsl/ppt-dsl.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RendererModule } from './modules/renderer/renderer.module';
import { SlidesModule } from './modules/slides/slides.module';
import { StorageModule } from './modules/storage/storage.module';
import { VisualsModule } from './modules/visuals/visuals.module';

@Module({
  imports: [
    StorageModule,
    ParserModule,
    LlmModule,
    PptDslModule,
    DesignModule,
    SlidesModule,
    VisualsModule,
    RendererModule,
    PipelineModule,
    ProjectsModule,
  ],
})
export class AppModule {}
