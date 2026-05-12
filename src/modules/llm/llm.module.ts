import { Module } from '@nestjs/common';

import { PptDslModule } from '../ppt-dsl/ppt-dsl.module';
import { LlmJsonService } from './llm-json.service';
import { LlmService } from './llm.service';

@Module({
  imports: [PptDslModule],
  providers: [LlmService, LlmJsonService],
  exports: [LlmService, LlmJsonService],
})
export class LlmModule {}
