"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/services/api";

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** HTTP status of the last failure - lets screens distinguish 404 from 500. */
  errorStatus: number | null;
};

/**
 * Small data-fetching hook: enough for server-backed screens that need
 * loading / empty / error states, without pulling in a query library.
 * Stale responses from previous filter combinations are ignored.
 */
export function useApiResource<T>(
  fetcher: () => Promise<T>,
  dependencies: readonly unknown[],
  options: { keepPreviousData?: boolean } = {},
) {
  const [state, setState] = useState<State<T>>({
    data: null,
    loading: true,
    error: null,
    errorStatus: null,
  });
  const requestId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    const currentRequest = (requestId.current += 1);
    setState((previous) => ({
      data: options.keepPreviousData ? previous.data : null,
      loading: true,
      error: null,
      errorStatus: null,
    }));

    try {
      const data = await fetcherRef.current();
      if (currentRequest !== requestId.current) return;
      setState({ data, loading: false, error: null, errorStatus: null });
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      const message =
        error instanceof ApiError ? error.message : "Something went wrong while loading this data.";
      setState({
        data: null,
        loading: false,
        error: message,
        errorStatus: error instanceof ApiError ? error.status : null,
      });
    }
  }, [options.keepPreviousData]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { ...state, reload: load };
}

/** Delays a rapidly changing value (search inputs) before it hits the API. */
export function useDebouncedValue<T>(value: T, delayMs = 350): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
