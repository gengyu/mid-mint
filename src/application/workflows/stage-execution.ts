import { z } from "zod";
import type { WorkflowStageStatus, LlmErrorCode, StageExecutionMeta } from "@/core/domain/types";
import { AppValidationError, createAppError } from "@/shared/errors/app-error";

export type StageRunResult<T> = {
  output: T;
  meta: StageExecutionMeta;
};

export type StructuredLlmResponse = {
  text: string;
  model: string;
};

export interface StructuredLlmProvider {
  generateStructuredText(
    prompt: string,
    options?: {
      timeoutMs?: number;
    }
  ): Promise<StructuredLlmResponse>;
  getDefaultModel(): string | null;
}

export class StageExecutionError extends AppValidationError {
  readonly meta: StageExecutionMeta;

  constructor(error: { code: string; message: string; details?: Record<string, unknown> }, meta: StageExecutionMeta) {
    super(error);
    this.meta = meta;
  }
}

function nowDurationMs(startedAt: number) {
  return Date.now() - startedAt;
}

function buildMeta(
  stageName: WorkflowStageStatus,
  input: Partial<Omit<StageExecutionMeta, "stageName" | "durationMs">> & { durationMs: number }
): StageExecutionMeta {
  return {
    stageName,
    usedLlm: false,
    llmAttempted: false,
    model: null,
    usedFallback: false,
    retryOccurred: false,
    errorCode: null,
    ...input
  };
}

function stripMarkdownCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseJsonCandidate(value: string) {
  const direct = stripMarkdownCodeFence(value);
  const objectStart = direct.indexOf("{");
  const objectEnd = direct.lastIndexOf("}");

  const candidates = [direct];
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(direct.slice(objectStart, objectEnd + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  throw new Error("Structured JSON parse failed.");
}

function toLlmErrorCode(error: unknown): LlmErrorCode {
  if (error instanceof AppValidationError) {
    const code = error.error.code;
    if (code.startsWith("LLM_")) {
      return code as LlmErrorCode;
    }
  }

  if (error instanceof Error && /timed out/i.test(error.message)) {
    return "LLM_TIMEOUT";
  }

  return "LLM_REQUEST_FAILED";
}

function toStageExecutionError(
  stageName: WorkflowStageStatus,
  code: string,
  message: string,
  startedAt: number,
  partialMeta: Partial<Omit<StageExecutionMeta, "stageName" | "durationMs" | "errorCode">> = {},
  details?: Record<string, unknown>
) {
  return new StageExecutionError(
    createAppError(code, message, details),
    buildMeta(stageName, {
      ...partialMeta,
      durationMs: nowDurationMs(startedAt),
      errorCode: code
    })
  );
}

export function createDeterministicStageResult<T>(
  stageName: WorkflowStageStatus,
  output: T,
  partialMeta?: Partial<Omit<StageExecutionMeta, "stageName" | "durationMs" | "errorCode">>
): StageRunResult<T> {
  return {
    output,
    meta: buildMeta(stageName, {
      ...partialMeta,
      durationMs: 0,
      errorCode: null
    })
  };
}

export async function runLlmStage<TInput, TParsed, TOutput>(options: {
  stageName: WorkflowStageStatus;
  input: TInput;
  validateInput?: (input: TInput) => void;
  prompt: string;
  provider: StructuredLlmProvider;
  responseSchema: z.ZodType<TParsed>;
  mapParsed: (parsed: TParsed, input: TInput) => TOutput;
  validateOutput: (output: TOutput) => TOutput;
  repairParsed?: (parsed: unknown, input: TInput) => TParsed | null;
  fallback?: (input: TInput) => TOutput;
  timeoutMs?: number;
  maxAttempts?: number;
}): Promise<StageRunResult<TOutput>> {
  const startedAt = Date.now();
  options.validateInput?.(options.input);

  const timeoutMs = options.timeoutMs ?? 20000;
  const maxAttempts = Math.max(1, options.maxAttempts ?? 2);
  const model = options.provider.getDefaultModel();
  let retryOccurred = false;
  let lastFailure: { code: LlmErrorCode; message: string } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (attempt > 1) {
      retryOccurred = true;
    }

    try {
      const response = await options.provider.generateStructuredText(options.prompt, { timeoutMs });
      const responseText = response.text.trim();
      const resolvedModel = response.model || model;
      if (!responseText) {
        throw toStageExecutionError(options.stageName, "LLM_OUTPUT_EMPTY", "LLM output is empty.", startedAt, {
          usedLlm: true,
          llmAttempted: true,
          model: resolvedModel,
          retryOccurred
        });
      }

      let rawParsed: unknown;
      try {
        rawParsed = parseJsonCandidate(responseText);
      } catch {
        throw toStageExecutionError(
          options.stageName,
          "LLM_OUTPUT_PARSE_FAILED",
          "LLM output could not be parsed as JSON.",
          startedAt,
          {
            usedLlm: true,
            llmAttempted: true,
            model: resolvedModel,
            retryOccurred
          }
        );
      }

      const repaired = options.repairParsed?.(rawParsed, options.input);
      const schemaResult = options.responseSchema.safeParse(repaired ?? rawParsed);
      if (!schemaResult.success) {
        throw toStageExecutionError(
          options.stageName,
          "LLM_OUTPUT_SCHEMA_INVALID",
          "LLM output schema validation failed.",
          startedAt,
          {
            usedLlm: true,
            llmAttempted: true,
            model: resolvedModel,
            retryOccurred
          },
          {
            issues: schemaResult.error.issues
          }
        );
      }

      const output = options.validateOutput(options.mapParsed(schemaResult.data, options.input));
      return {
        output,
        meta: buildMeta(options.stageName, {
          usedLlm: true,
          llmAttempted: true,
          model: resolvedModel,
          usedFallback: false,
          retryOccurred,
          durationMs: nowDurationMs(startedAt),
          errorCode: null
        })
      };
    } catch (error) {
      if (error instanceof StageExecutionError) {
        lastFailure = {
          code: error.error.code as LlmErrorCode,
          message: error.error.message
        };
      } else {
        lastFailure = {
          code: toLlmErrorCode(error),
          message: error instanceof Error ? error.message : "LLM request failed."
        };
      }

      if (attempt === maxAttempts) {
        break;
      }
    }
  }

  if (options.fallback) {
    try {
      const output = options.validateOutput(options.fallback(options.input));
      return {
        output,
        meta: buildMeta(options.stageName, {
          usedLlm: true,
          llmAttempted: true,
          model,
          usedFallback: true,
          retryOccurred,
          durationMs: nowDurationMs(startedAt),
          errorCode: null
        })
      };
    } catch (error) {
      throw toStageExecutionError(
        options.stageName,
        "LLM_FALLBACK_EXHAUSTED",
        error instanceof Error ? error.message : "Deterministic fallback could not produce valid output.",
        startedAt,
        {
          usedLlm: true,
          llmAttempted: true,
          model,
          usedFallback: true,
          retryOccurred
        }
      );
    }
  }

  const failure = lastFailure ?? { code: "LLM_REQUEST_FAILED" as LlmErrorCode, message: "LLM stage failed." };
  throw toStageExecutionError(options.stageName, failure.code, failure.message, startedAt, {
    usedLlm: true,
    llmAttempted: true,
    model,
    usedFallback: false,
    retryOccurred
  });
}
