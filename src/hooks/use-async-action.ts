"use client";

import { useState, useCallback } from "react";

interface UseAsyncActionOptions<TArgs extends any[], TResult> {
  onSuccess?: (result: TResult, args: TArgs) => void;
  onError?: (error: Error, args: TArgs) => void;
}

interface UseAsyncActionResult<TArgs extends any[], TResult> {
  execute: (...args: TArgs) => Promise<TResult | undefined>;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * useAsyncAction — wrap async function dengan loading & error state.
 *
 * Menggantikan boilerplate try-catch-loading-setLoading di setiap mutation.
 *
 * Example:
 *   const { execute, loading, error } = useAsyncAction(
 *     async (id: string) => await api.delete(`/api/books/${id}`),
 *     {
 *       onSuccess: () => { toast.success("Dihapus"); refetch(); },
 *       onError: (err) => toast.error(err.message),
 *     }
 *   );
 *
 *   <Button onClick={() => execute("123")} disabled={loading}>
 *     {loading ? "..." : "Hapus"}
 *   </Button>
 */
export function useAsyncAction<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: UseAsyncActionOptions<TArgs, TResult> = {}
): UseAsyncActionResult<TArgs, TResult> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn(...args);
        options.onSuccess?.(result, args);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        options.onError?.(error, args);
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [fn, options]
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { execute, loading, error, reset };
}
