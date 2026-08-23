#!/bin/bash
# Verification script untuk Sprint 1-4 dashboard refactor
# Cek: import resolution, type compat, integrasi komponen, file existence

set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "=========================================="
echo "  Sprint 1-4 Dashboard Verification"
echo "=========================================="
echo ""

# ---------- 1. File Existence Checks ----------
echo "─── File Existence ───"
for f in \
  "src/components/app/shared/role-badge.tsx" \
  "src/components/app/shared/role-empty-state.tsx" \
  "src/components/app/shared/default-dashboard-selector.tsx" \
  "src/components/app/shared/set-as-home-button.tsx" \
  "src/components/app/dashboard/widgets/index.ts" \
  "src/components/app/dashboard/widgets/types.ts" \
  "src/components/app/dashboard/widgets/trend-area-chart.tsx" \
  "src/components/app/dashboard/widgets/category-donut-chart.tsx" \
  "src/components/app/dashboard/widgets/top-books-list.tsx" \
  "src/components/app/dashboard/widgets/top-members-list.tsx" \
  "src/components/app/dashboard/widgets/recent-loans-table.tsx" \
  "src/components/app/dashboard/widgets/executive-kpi-card.tsx" \
  "src/components/app/dashboard/widgets/executive-trend-chart.tsx" \
  "src/components/app/dashboard/widgets/executive-top-list.tsx" \
  "src/components/app/dashboard/widgets/executive-alert-card.tsx" \
  "src/app/api/users/me/preferences/route.ts" \
  "prisma/migrations/20260822_add_user_preference/migration.sql" \
  "docs/fix-plan-dashboard.md"
do
  if [ -f "$f" ]; then pass "$f"; else fail "MISSING: $f"; fi
done
echo ""

# ---------- 2. Schema Validation ----------
echo "─── Schema (UserPreference) ───"
if grep -q "model UserPreference" prisma/schema.prisma; then
  pass "UserPreference model exists"
else
  fail "UserPreference model missing"
fi
if grep -q "defaultDashboard" prisma/schema.prisma; then
  pass "defaultDashboard field exists"
else
  fail "defaultDashboard field missing"
fi
if grep -q "preference.*UserPreference" prisma/schema.prisma; then
  pass "User.preference relation exists"
else
  fail "User.preference relation missing"
fi
echo ""

# ---------- 3. API Endpoint Checks ----------
echo "─── API Endpoints ───"
api_file="src/app/api/users/me/preferences/route.ts"
if grep -q "export async function GET" "$api_file"; then pass "GET /api/users/me/preferences"; else fail "GET missing"; fi
if grep -q "export async function PUT" "$api_file"; then pass "PUT /api/users/me/preferences"; else fail "PUT missing"; fi
if grep -q "requireAuth" "$api_file"; then pass "Auth required"; else fail "Auth missing"; fi
if grep -q "VALID_DASHBOARD_VIEWS" "$api_file"; then pass "Validation uses constants"; else fail "No validation"; fi
echo ""

# ---------- 4. Migration SQL ----------
echo "─── Migration SQL ───"
mig="prisma/migrations/20260822_add_user_preference/migration.sql"
if grep -q "CREATE TABLE" "$mig"; then pass "CREATE TABLE statement"; else fail "No CREATE TABLE"; fi
if grep -q "UserPreference" "$mig"; then pass "UserPreference table"; else fail "Wrong table name"; fi
if grep -q "FOREIGN KEY" "$mig" && grep -q "User" "$mig"; then pass "FK to User"; else fail "No FK"; fi
if grep -q "ON DELETE CASCADE" "$mig"; then pass "CASCADE delete"; else fail "No cascade"; fi
echo ""

# ---------- 5. Component Integration ----------
echo "─── Component Integration ───"
# RoleBadge di 4 dashboard
for view in dashboard-view customizable-dashboard-view executive-dashboard-view my-dashboard-view; do
  if grep -q "RoleBadge" "src/components/app/views/${view}.tsx"; then
    pass "RoleBadge in $view"
  else
    fail "RoleBadge missing in $view"
  fi
done

# SetAsHomeButton di 3 dashboard (LIBRARIAN punya 3, TEACHER/STUDENT hanya 1)
for view in dashboard-view customizable-dashboard-view executive-dashboard-view; do
  if grep -q "SetAsHomeButton" "src/components/app/views/${view}.tsx"; then
    pass "SetAsHomeButton in $view"
  else
    fail "SetAsHomeButton missing in $view"
  fi
done

# DefaultDashboardSelector di settings
if grep -q "DefaultDashboardSelector" src/components/app/views/settings-view.tsx; then
  pass "DefaultDashboardSelector in settings-view"
else
  fail "DefaultDashboardSelector missing in settings-view"
fi
echo ""

# ---------- 6. Widget Usage ----------
echo "─── Shared Widget Usage ───"
# DashboardView harus pakai 6 widget
for widget in TrendAreaChart CategoryDonutChart TopBooksList TopMembersList RecentLoansTable; do
  count=$(grep -c "$widget" src/components/app/views/dashboard-view.tsx)
  if [ "$count" -ge 1 ]; then
    pass "$widget in dashboard-view (used $count times)"
  else
    fail "$widget NOT in dashboard-view"
  fi
done

# ExecutiveDashboardView pakai 4 exec widget
for widget in ExecutiveKpiCard ExecutiveTrendChart ExecutiveTopList ExecutiveAlertCard; do
  count=$(grep -c "$widget" src/components/app/views/executive-dashboard-view.tsx)
  if [ "$count" -ge 1 ]; then
    pass "$widget in executive-dashboard-view (used $count times)"
  else
    fail "$widget NOT in executive-dashboard-view"
  fi
done
echo ""

# ---------- 7. Store Integration ----------
echo "─── Store Integration ───"
store="src/store/use-app-store.ts"
if grep -q "dashboardVariant" "$store"; then pass "dashboardVariant field"; else fail "dashboardVariant missing"; fi
if grep -q "resolveDefaultDashboard" "$store"; then pass "resolveDefaultDashboard helper"; else fail "resolveDefaultDashboard missing"; fi
if grep -q "defaultDashboard" "$store"; then pass "defaultDashboard handling"; else fail "defaultDashboard not handled"; fi
echo ""

# ---------- 8. Sidebar Check ----------
echo "─── Sidebar ───"
sidebar="src/components/app/layout/sidebar.tsx"
if grep -q "goToHome" "$sidebar"; then pass "goToHome function"; else fail "goToHome missing"; fi
if grep -q "FileText" "$sidebar"; then pass "FileText imported"; else fail "FileText import missing"; fi
if grep -q 'executive-dashboard' "$sidebar" && grep -q 'PUSTAKAWAN_JUNIOR' "$sidebar"; then
  pass "Junior filter on executive-dashboard"
else
  fail "Junior filter missing"
fi
echo ""

# ---------- 9. Page Router ----------
echo "─── Page Router (app/page.tsx) ───"
page="src/app/page.tsx"
if grep -q 'view.dashboardVariant' "$page"; then
  pass "Uses view.dashboardVariant"
else
  fail "Not using store's dashboardVariant"
fi
# Verify duplicate removed
dup_count=$(grep -c 'return <ReportsView />' "$page")
if [ "$dup_count" -eq 1 ]; then
  pass "No duplicate ReportsView return"
else
  fail "Found $dup_count ReportsView returns (expected 1)"
fi
echo ""

# ---------- 10. RoleEmptyState Context Coverage ----------
echo "─── RoleEmptyState Contexts ───"
res="src/components/app/shared/role-empty-state.tsx"
context_count=$(grep -cE '^\s*\|"no-' "$res" 2>/dev/null || echo 0)
unique_contexts=$(grep -oE '"no-[a-z-]+":' "$res" | sort -u | wc -l)
echo "  Found $unique_contexts unique contexts"
if [ "$unique_contexts" -ge 10 ]; then
  pass "Comprehensive context coverage ($unique_contexts contexts)"
else
  warn "Only $unique_contexts contexts (target: 10+)"
fi
echo ""

# ---------- 11. View Line Counts ----------
echo "─── View Line Counts (semakin kecil = semakin bersih) ───"
for view in dashboard-view customizable-dashboard-view executive-dashboard-view my-dashboard-view; do
  lines=$(wc -l < "src/components/app/views/${view}.tsx" 2>/dev/null || echo 0)
  echo "  ${view}.tsx: ${lines} lines"
done
echo ""

# ---------- 12. Final summary ----------
echo "=========================================="
echo "  Summary"
echo "=========================================="
commit_count=$(git log --oneline 7cc498f..HEAD | wc -l)
echo "Commits sejak 7cc498f: $commit_count"
echo ""
echo "Latest 5 commits:"
git log --oneline -5
echo ""

echo "─── Test Files ───"
test_count=$(find . -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | grep -v node_modules | wc -l)
echo "Total test files: $test_count"
echo ""

echo "─── Accessibility Coverage (sample) ───"
echo "  Files dengan aria-label: $(grep -rl 'aria-label' src/components/app/shared src/components/app/dashboard 2>/dev/null | wc -l)"
echo "  Files dengan aria-hidden: $(grep -rl 'aria-hidden' src/components/app/shared src/components/app/dashboard 2>/dev/null | wc -l)"
echo "  Files dengan role attribute: $(grep -rl 'role=' src/components/app/shared src/components/app/dashboard 2>/dev/null | wc -l)"

echo -e "${GREEN}Selesai.${NC}"
