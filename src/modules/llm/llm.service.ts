import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

import { getLlmConfig } from '../../config/llm.config';

@Injectable()
export class LlmService {
  isConfigured(): boolean {
    const config = getLlmConfig();
    return Boolean(config.baseUrl && config.model);
  }

  async generateJson<T>(prompt: string): Promise<T | null> {
    const config = getLlmConfig();
    if (!config.baseUrl || !config.model) {
      return null;
    }

    const client = new OpenAI({
      apiKey: config.apiKey || 'mid-mint-local',
      baseURL: config.baseUrl,
    });

    try {
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
        return null;
      }

      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }
}
