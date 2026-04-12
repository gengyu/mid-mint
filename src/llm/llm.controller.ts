import { Controller, Get } from '@nestjs/common';
import { OpenAiProvider } from '../lib/llm/openai';

@Controller('api')
export class LlmController {
  constructor(private readonly openAiProvider: OpenAiProvider) {}

  @Get('llm-health')
  async checkLlmHealth() {
    const health = await this.openAiProvider.checkHealth();
    return health;
  }
}
