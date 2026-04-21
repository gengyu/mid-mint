import { Module } from '@nestjs/common';

import { LlmJsonService } from './llm-json.service';
import { LlmService } from './llm.service';

@Module({
  providers: [LlmService, LlmJsonService],
  exports: [LlmService, LlmJsonService],
})
export class LlmModule {}
