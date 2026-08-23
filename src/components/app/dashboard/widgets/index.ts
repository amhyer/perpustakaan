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

// Sprint G2 — Role-specific widgets
export { LibrarianActivityWidget } from "./librarian-activity-widget";
export { StudentQuickActionsWidget } from "./student-quick-actions-widget";
export { TeacherInsightsWidget } from "./teacher-insights-widget";

// Sprint M — Reading level & gamification
export { ReadingLevelWidget } from "./reading-level-widget";
export { StreakCalendarWidget } from "./streak-calendar-widget";
export { ClassLeaderboardWidget } from "./class-leaderboard-widget";

// Sprint U — Unified showcase
export { AchievementShowcaseWidget } from "./achievement-showcase-widget";
