export type AppError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export function createAppError(code: string, message: string, details?: Record<string, unknown>): AppError {
  return details ? { code, message, details } : { code, message };
}

export class AppValidationError extends Error {
  readonly error: AppError;

  constructor(error: AppError) {
    super(error.message);
    this.name = "AppValidationError";
    this.error = error;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isAppValidationError(error: unknown): error is AppValidationError {
  return error instanceof AppValidationError;
}

export function toAppError(error: unknown): AppError {
  if (isAppValidationError(error)) {
    return error.error;
  }

  if (error instanceof Error) {
    return createAppError("UNKNOWN_ERROR", error.message);
  }

  return createAppError("UNKNOWN_ERROR", "Unknown error.");
}
