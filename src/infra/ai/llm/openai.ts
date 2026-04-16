import OpenAI from "openai";
import { z } from "zod";
import type { LlmProvider } from "./provider";
import type { GenerateRequest, GeneratedCopy, TemplateSchema } from "@/infra/rendering/templates/types";
import { buildCopyPrompt } from "./prompts";
import { fallbackGenerateCopy } from "@/infra/rendering/pipeline/fallback-copy";
import { safeJsonParse } from "@/infra/utils/json";

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

function extractMessageText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((item) =>
        item && typeof item === "object" && "text" in item && typeof item.text === "string" ? item.text : ""
      )
      .join("")
      .trim();
  }

  return "";
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

  getDefaultModel() {
    return this.client ? this.model : null;
  }

  private async createChatTextCompletion(
    prompt: string,
    options?: {
      timeoutMs?: number;
      systemPrompt?: string;
    }
  ) {
    if (!this.client) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const response = await withTimeout(
      this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              options?.systemPrompt ??
              "You are a precise structured-output assistant. Follow the user's output format exactly."
          },
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      options?.timeoutMs ?? 20000,
      "LLM request"
    );

    return {
      text: extractMessageText(response.choices[0]?.message?.content),
      model: response.model || this.model
    };
  }

  async generateCopy(request: GenerateRequest, template: TemplateSchema): Promise<GeneratedCopy> {
    if (!this.client) {
      return fallbackGenerateCopy(request.prompt, template);
    }

    try {
      const response = await this.createChatTextCompletion(buildCopyPrompt(request.prompt, template), {
        systemPrompt: "You generate concise Xiaohongshu copy JSON for template slots. Return valid JSON only."
      });
      const text = response.text;
      const parsed = generatedCopySchema.parse(safeJsonParse(text));
      return parsed;
    } catch {
      return fallbackGenerateCopy(request.prompt, template);
    }
  }

  async generateStructuredText(
    prompt: string,
    options?: {
      timeoutMs?: number;
    }
  ): Promise<{ text: string; model: string }> {
    return this.createChatTextCompletion(prompt, options);
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
      const response = await this.createChatTextCompletion("Reply with OK", {
        timeoutMs: 15000,
        systemPrompt: "Reply with OK."
      });

      return {
        ok: true,
        ...config,
        latencyMs: Date.now() - startedAt,
        message: response.text.trim() || "Provider responded successfully."
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
