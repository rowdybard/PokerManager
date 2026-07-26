import { useRef } from 'react'
import { useQuery, type QueryKey } from '@tanstack/react-query'
import { errorMessage } from '../../lib/errors'

export function useProResource<T>(queryKey: QueryKey, loader: () => Promise<T>) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const query = useQuery({
    queryKey,
    queryFn: () => loaderRef.current(),
  })

  return {
    data: query.data ?? null,
    error: query.error ? errorMessage(query.error) : null,
    loading: query.isPending,
    reload: query.refetch,
  }
}
