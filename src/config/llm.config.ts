export interface LlmConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export function getLlmConfig(): LlmConfig {
  return {
    apiKey: process.env.LLM_API_KEY,
    baseUrl: process.env.LLM_BASE_URL,
    model: process.env.LLM_MODEL,
  };
}
