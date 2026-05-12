import { Injectable } from '@nestjs/common';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableLambda, RunnableSequence } from '@langchain/core/runnables';
import OpenAI from 'openai';

import { getLlmConfig } from '../../config/llm.config';

interface JsonGenerationInput {
  prompt: string;
}

@Injectable()
export class LlmService {
  isConfigured(): boolean {
    const config = getLlmConfig();
    return Boolean(config.baseUrl && config.model);
  }

  async generateJson<T extends object>(prompt: string): Promise<T | null> {
    const config = getLlmConfig();
    if (!config.baseUrl || !config.model) {
      return null;
    }

    try {
      const chain = this.createJsonGenerationChain<T>();
      return await chain.invoke({ prompt });
    } catch {
      return null;
    }
  }

  private createJsonGenerationChain<T extends object>() {
    return RunnableSequence.from<JsonGenerationInput, T>([
      RunnableLambda.from<JsonGenerationInput, string>((input) => input.prompt),
      this.createOpenAiCompatibleJsonRunnable(),
      new JsonOutputParser<T>(),
    ]);
  }

  private createOpenAiCompatibleJsonRunnable() {
    return RunnableLambda.from<string, string>(async (prompt) => {
      const config = getLlmConfig();
      if (!config.baseUrl || !config.model) {
        throw new Error('LLM is not configured.');
      }

      const client = new OpenAI({
        apiKey: config.apiKey || 'mid-mint-local',
        baseURL: config.baseUrl,
      });

      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'Return valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: {
          type: 'json_object',
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('LLM returned an empty response.');
      }

      return content;
    });
  }
}
