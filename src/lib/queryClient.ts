import { QueryClient } from '@tanstack/react-query'
import { AppError, toAppError } from './errors'

function shouldRetry(failureCount: number, error: unknown) {
  const appError = toAppError(error)
  if (
    appError.code === 'AUTH_REQUIRED' ||
    appError.code === 'FORBIDDEN' ||
    appError.code === 'NOT_FOUND' ||
    appError.code === 'VALIDATION'
  ) {
    return false
  }
  return failureCount < 2
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof AppError && error.code !== 'OFFLINE') return false
        return failureCount < 1
      },
    },
  },
})
