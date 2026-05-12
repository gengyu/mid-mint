import { Module } from '@nestjs/common';

import { AssetsModule } from './modules/assets/assets.module';
import { LlmModule } from './modules/llm/llm.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { PptDslModule } from './modules/ppt-dsl/ppt-dsl.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RendererModule } from './modules/renderer/renderer.module';
import { StorageModule } from './modules/storage/storage.module';
import { ToolsModule } from './modules/tools/tools.module';

@Module({
  imports: [
    StorageModule,
    ToolsModule,
    LlmModule,
    PptDslModule,
    AssetsModule,
    RendererModule,
    PipelineModule,
    ProjectsModule,
  ],
})
export class AppModule {}
