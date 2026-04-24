import { Module } from '@nestjs/common';

import { LlmModule } from '../llm/llm.module';
import { DesignService } from './design.service';

@Module({
  imports: [LlmModule],
  providers: [DesignService],
  exports: [DesignService],
})
export class DesignModule {}
