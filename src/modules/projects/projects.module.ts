import { Module } from '@nestjs/common';

import { PipelineModule } from '../pipeline/pipeline.module';
import { StorageModule } from '../storage/storage.module';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [StorageModule, PipelineModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
