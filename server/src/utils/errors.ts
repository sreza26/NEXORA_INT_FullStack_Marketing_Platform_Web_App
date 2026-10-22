/**
 * Business rule violations.
 *
 * The Laravel reference raises `ValidationException` for these cases, which
 * renders as HTTP 422. The service layer raises `BusinessRuleError` and the
 * error handler maps it onto the same status code, so the API answers with a
 * clean message instead of a 500.
 */
export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BusinessRuleError'
  }
}

export function isBusinessRuleError(error: unknown): error is BusinessRuleError {
  return error instanceof BusinessRuleError
}
