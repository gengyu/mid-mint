import { Module } from '@nestjs/common';
import { LlmController } from './llm.controller';
import { OpenAiProvider } from '@/infra/ai/llm/openai';

@Module({
  controllers: [LlmController],
  providers: [OpenAiProvider],
})
export class LlmModule {}
