export type ErrorCode =
  | 'AUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'OFFLINE'
  | 'UNKNOWN'

export class AppError extends Error {
  readonly code: ErrorCode
  readonly cause?: unknown

  constructor(message: string, code: ErrorCode = 'UNKNOWN', cause?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.cause = cause
  }
}

type ErrorLike = {
  message?: unknown
  code?: unknown
  status?: unknown
}

function mapErrorCode(error: ErrorLike): ErrorCode {
  if (error.status === 401 || error.code === 'PGRST301') return 'AUTH_REQUIRED'
  if (error.status === 403 || error.code === '42501') return 'FORBIDDEN'
  if (error.status === 404 || error.code === 'PGRST116') return 'NOT_FOUND'
  if (error.status === 409 || error.code === '23505') return 'CONFLICT'
  if (error.code === '23514' || error.code === '22P02') return 'VALIDATION'
  return 'UNKNOWN'
}

export function toAppError(error: unknown, fallback = 'Something went wrong.'): AppError {
  if (error instanceof AppError) return error

  if (error instanceof Error) {
    return new AppError(error.message || fallback, mapErrorCode(error), error)
  }

  if (error && typeof error === 'object') {
    const candidate = error as ErrorLike
    const message =
      typeof candidate.message === 'string' && candidate.message.trim()
        ? candidate.message
        : fallback
    return new AppError(message, mapErrorCode(candidate), error)
  }

  return new AppError(fallback, 'UNKNOWN', error)
}

export function errorMessage(error: unknown, fallback?: string): string {
  return toAppError(error, fallback).message
}
