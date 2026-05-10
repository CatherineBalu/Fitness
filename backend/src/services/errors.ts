export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class BadRequestError extends HttpError {
  constructor(message = 'Bad request') {
    super(400, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Not found') {
    super(404, message);
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Conflict') {
    super(409, message);
  }
}

export class ValidationError extends HttpError {
  constructor(
    message = 'Validation failed',
    public readonly fieldErrors?: Record<string, string[] | undefined>,
  ) {
    super(422, message);
  }
}

interface StatusSetter {
  status?: unknown;
}

export async function handleRoute<T>(
  set: StatusSetter,
  fn: () => Promise<T>,
): Promise<T | { error: string } | { errors: Record<string, string[] | undefined> }> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ValidationError) {
      set.status = err.status;
      return { errors: err.fieldErrors ?? {} };
    }
    if (err instanceof HttpError) {
      set.status = err.status;
      return { error: err.message };
    }
    console.error('[unexpected]', err);
    set.status = 500;
    return { error: 'Internal server error' };
  }
}
