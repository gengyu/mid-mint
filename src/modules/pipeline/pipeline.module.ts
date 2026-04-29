import { Module } from '@nestjs/common';

import { AssetsModule } from '../assets/assets.module';
import { LlmModule } from '../llm/llm.module';
import { PptDslModule } from '../ppt-dsl/ppt-dsl.module';
import { RendererModule } from '../renderer/renderer.module';
import { StorageModule } from '../storage/storage.module';
import { ToolsModule } from '../tools/tools.module';
import { PipelineService } from './pipeline.service';

@Module({
  imports: [
    ToolsModule,
    LlmModule,
    PptDslModule,
    AssetsModule,
    RendererModule,
    StorageModule,
  ],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
