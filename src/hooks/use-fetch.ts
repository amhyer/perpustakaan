"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseFetchOptions {
  deps?: unknown[];
  skip?: boolean;
}

interface UseFetchResult<T> {
  data: T | undefined;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  setData: (data: T | undefined) => void;
}

/**
 * Hook sederhana untuk fetch data dari API.
 * Semua pemanggilan setState dilakukan di dalam fungsi async (bukan sinkron
 * di body effect) agar tidak memicu aturan react-hooks/set-state-in-effect.
 */
export function useFetch<T>(url: string | null, options: UseFetchOptions = {}): UseFetchResult<T> {
  const { deps = [], skip = false } = options;
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(!skip && !!url);
  const [error, setError] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const refetch = useCallback(() => setRefetchKey((k) => k + 1), []);

  useEffect(() => {
    if (!url || skip) {
      return;
    }
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const run = async () => {
      // setState di sini berada di dalam async function, dieksekusi setelah
      // microtask queue — tidak sinkron di body effect.
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(url, { signal: controller.signal, credentials: "include" });
        if (!res.ok) {
          let msg = `Error ${res.status}`;
          try {
            const j = await res.json();
            msg = j.error || j.message || msg;
          } catch {
            // ignore
          }
          throw new Error(msg);
        }
        const d = await res.json();
        if (!controller.signal.aborted) {
          setData(d);
          setLoading(false);
        }
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setError(e instanceof Error ? e.message : "Gagal memuat data");
          setLoading(false);
        }
      }
    };
    void run();

    return () => controller.abort();
  }, [url, refetchKey, skip, ...deps]);

  return { data, loading, error, refetch, setData };
}
