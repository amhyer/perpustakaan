"use client";

import { useState, useCallback, useMemo } from "react";

interface UsePaginationOptions {
  initialPage?: number;
  pageSize?: number;
}

interface UsePaginationResult {
  page: number;
  pageSize: number;
  offset: number;
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  reset: () => void;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  pageNumbers: (number | "...")[];
}

/**
 * usePagination — manage paginated state.
 *
 * Returns pagination helpers & computed values.
 * Use with useFetch atau manual data fetching.
 *
 * Example:
 *   const { page, pageSize, offset } = usePagination({ pageSize: 20 });
 *   const { data } = useFetch(`/api/books?page=${page}&pageSize=${pageSize}`);
 */
export function usePagination(options: UsePaginationOptions = {}): UsePaginationResult {
  const { initialPage = 1, pageSize: initialSize = 20 } = options;
  const [page, setPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialSize);
  const [total, setTotal] = useState<number>(0);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);
  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);
  const reset = useCallback(() => setPage(1), []);

  // Generate smart page numbers: 1, 2, 3 ... 10
  const pageNumbers = useMemo<(number | "...")[]>(() => {
    const pages: (number | "...")[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Always show first
      pages.push(1);
      // Middle range
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      // Always show last
      pages.push(totalPages);
    }
    return pages;
  }, [page, totalPages]);

  return {
    page,
    pageSize,
    offset,
    setPage: (p: number) => setPage(Math.max(1, Math.min(totalPages, p))),
    nextPage,
    prevPage,
    setPageSize,
    reset,
    totalPages,
    hasNext,
    hasPrev,
    pageNumbers,
  };
}
