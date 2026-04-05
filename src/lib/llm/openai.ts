import OpenAI from "openai";
import { z } from "zod";
import type { LlmProvider } from "./provider";
import type { GenerateRequest, GeneratedCopy, TemplateSchema } from "@/lib/templates/types";
import { buildCopyPrompt } from "./prompts";
import { fallbackGenerateCopy } from "@/lib/pipeline/fallback-copy";
import { safeJsonParse } from "@/lib/utils/json";

const generatedCopySchema = z.object({
  templateId: z.string(),
  values: z.record(z.string())
});

function maskSecret(value: string | undefined) {
  if (!value) {
    return "";
  }

  if (value.length <= 8) {
    return "****";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function withTimeout<T>(task: Promise<T>, ms: number, label: string) {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race<T>([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${ms}ms.`));
        }, ms);
      })
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export class OpenAiProvider implements LlmProvider {
  private client: OpenAI | null;
  private model: string;
  private baseURL: string | undefined;
  private apiKeyMasked: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = process.env.OPENAI_BASE_URL || undefined;
    this.client = apiKey
      ? new OpenAI({
          apiKey,
          baseURL: this.baseURL
        })
      : null;
    this.model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
    this.apiKeyMasked = maskSecret(apiKey);
  }

  getConfig() {
    return {
      configured: Boolean(this.client),
      model: this.model,
      baseURL: this.baseURL || "https://api.openai.com/v1",
      apiKeyMasked: this.apiKeyMasked
    };
  }

  async generateCopy(request: GenerateRequest, template: TemplateSchema): Promise<GeneratedCopy> {
    if (!this.client) {
      return fallbackGenerateCopy(request.prompt, template);
    }

    try {
      const response = await this.client.responses.create({
        model: this.model,
        input: buildCopyPrompt(request.prompt, template)
      });

      const text = response.output_text;
      const parsed = generatedCopySchema.parse(safeJsonParse(text));
      return parsed;
    } catch {
      return fallbackGenerateCopy(request.prompt, template);
    }
  }

  async generateStructuredText(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const response = await withTimeout(
      this.client.responses.create({
        model: this.model,
        input: prompt
      }),
      20000,
      "LLM request"
    );

    return response.output_text;
  }

  async checkHealth() {
    const config = this.getConfig();
    if (!this.client) {
      return {
        ok: false,
        ...config,
        message: "OPENAI_API_KEY is not configured."
      };
    }

    const startedAt = Date.now();
    try {
      const response = await withTimeout(
        this.client.responses.create({
          model: this.model,
          input: "Reply with OK"
        }),
        15000,
        "LLM health check"
      );

      return {
        ok: true,
        ...config,
        latencyMs: Date.now() - startedAt,
        message: response.output_text.trim() || "Provider responded successfully."
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Health check failed.";
      return {
        ok: false,
        ...config,
        latencyMs: Date.now() - startedAt,
        message
      };
    }
  }
}
