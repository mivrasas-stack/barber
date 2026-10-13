export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UnauthenticatedError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHENTICATED";
  constructor(message = "Authentication required") {
    super(message);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";
  constructor(message = "You do not have permission to perform this action") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";
  constructor(entity: string, identifier?: string) {
    super(`${entity}${identifier ? ` with identifier '${identifier}'` : ""} not found`);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";
  constructor(message: string) {
    super(message);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
  constructor(message: string, public readonly details?: unknown) {
    super(message);
  }
}

export class RateLimitExceededError extends AppError {
  readonly statusCode = 429;
  readonly code = "RATE_LIMIT_EXCEEDED";
  constructor(
    message = "Too many requests. Please try again later.",
    public readonly retryAfterSeconds = 1
  ) {
    super(message);
  }
}

