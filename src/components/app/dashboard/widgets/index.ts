/**
 * Barrel export untuk dashboard widgets.
 *
 * Widget-widget ini dipakai bersama oleh DashboardView, CustomizableDashboardView,
 * dan ExecutiveDashboardView. Refactor Sprint 2 (Fix #2 + #10) memindahkan
 * bagian yang duplicated ke sini.
 */

export * from "./types";
export { TrendAreaChart } from "./trend-area-chart";
export { CategoryDonutChart } from "./category-donut-chart";
export { TopBooksList } from "./top-books-list";
export { TopMembersList } from "./top-members-list";
export { RecentLoansTable } from "./recent-loans-table";

// Executive dashboard components (Fix #10)
export { ExecutiveKpiCard } from "./executive-kpi-card";
export { ExecutiveTrendChart } from "./executive-trend-chart";
export { ExecutiveTopList } from "./executive-top-list";
export { ExecutiveAlertCard } from "./executive-alert-card";

// Performance optimization (Sprint 4)
export { LazyChart } from "./lazy-chart";
