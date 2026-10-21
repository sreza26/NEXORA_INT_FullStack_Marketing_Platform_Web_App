import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

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

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message })
    return
  }

  if (error instanceof ZodError) {
    res.status(422).json({ message: error.errors[0]?.message ?? 'Validation failed', errors: error.errors })
    return
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error'
  console.error('[nexora] unhandled error:', message)
  res.status(500).json({ message })
}
