import { Injectable } from '@nestjs/common';

import { getLlmConfig } from '../../config/llm.config';

interface ChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

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

    const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
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
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ChatResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return null;
    }

    try {
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }
}
