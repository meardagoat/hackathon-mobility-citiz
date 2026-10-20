'use client';
import { useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(fetcher: () => Promise<T>, key: string): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((previous) => ({ ...previous, loading: true, error: null }));
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof ApiError || error instanceof Error ? error.message : 'Erreur inconnue';
          setState({ data: null, loading: false, error: message });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
