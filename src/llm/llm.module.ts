import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { OpenAiProvider } from '../lib/llm/openai';

@Module({
  controllers: [LlmController],
  providers: [OpenAiProvider],
})
export class LlmModule {}
