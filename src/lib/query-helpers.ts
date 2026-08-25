/**
 * Generic helper untuk parse query params.
 * Tipe-safe & reusable.
 */

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export interface SortParams {
  field: string;
  order: "asc" | "desc";
}

/**
 * Parse pagination params dari URL search params.
 * Default: page=1, pageSize=20, max pageSize=100.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  options: { defaultPageSize?: number; maxPageSize?: number } = {}
): PaginationParams {
  const { defaultPageSize = 20, maxPageSize = 100 } = options;
  const rawPage = parseInt(searchParams.get("page") || "1");
  const rawPageSize = parseInt(searchParams.get("pageSize") || String(defaultPageSize));
  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const pageSize = Math.min(
    maxPageSize,
    Math.max(1, isNaN(rawPageSize) ? defaultPageSize : rawPageSize)
  );
  return { page, pageSize, offset: (page - 1) * pageSize };
}

/**
 * Parse sort param. Format: "field" atau "field-order"
 * Example: ?sort=title-asc, ?sort=year-desc
 */
export function parseSort(
  searchParams: URLSearchParams,
  allowedFields: string[] = [],
  defaultSort: SortParams = { field: "createdAt", order: "desc" }
): SortParams {
  const param = searchParams.get("sort");
  if (!param) return defaultSort;

  const [field, order = "asc"] = param.split("-");
  if (allowedFields.length > 0 && !allowedFields.includes(field)) {
    return defaultSort;
  }
  return { field, order: order === "desc" ? "desc" : "asc" };
}

/**
 * Parse filter date range. Format: ?dateFrom=ISO&dateTo=ISO
 */
export function parseDateRange(searchParams: URLSearchParams): { from?: Date; to?: Date } {
  const from = searchParams.get("dateFrom");
  const to = searchParams.get("dateTo");
  return {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  };
}

/**
 * Build pagination response wrapper.
 */
export function paginatedResponse<T>(data: T[], total: number, params: PaginationParams) {
  return {
    data,
    pagination: {
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
      hasNext: params.page < Math.ceil(total / params.pageSize),
      hasPrev: params.page > 1,
    },
  };
}

/**
 * Parse comma-separated list ke array, trimming whitespace.
 */
export function parseList(searchParams: URLSearchParams, key: string): string[] {
  const value = searchParams.get(key);
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

/**
 * Parse integer with default.
 */
export function parseIntSafe(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}
