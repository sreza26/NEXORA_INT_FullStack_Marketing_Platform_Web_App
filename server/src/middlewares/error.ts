import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { isBusinessRuleError } from '../utils/errors.js'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ message: 'Endpoint not found' })
}

/**
 * Wrap an async handler so a rejected promise reaches the Express error
 * pipeline. Express 4 does not do this on its own.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next)
  }
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message })
    return
  }

  if (error instanceof ZodError) {
    res.status(422).json({ message: error.issues[0]?.message ?? 'Validation failed', errors: error.issues })
    return
  }

  // Business rule violations answer with 422, matching the Laravel
  // ValidationException behaviour.
  if (isBusinessRuleError(error)) {
    res.status(422).json({ message: error.message })
    return
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error'
  console.error('[nexora] unhandled error:', message)
  res.status(500).json({ message })
}
