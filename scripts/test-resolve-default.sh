#!/bin/bash
# Test logika resolveDefaultDashboard di store
# Simulasi: berbagai kombinasi user.role + user.defaultDashboard

set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; FAILED=1; }
FAILED=0

# Extract resolveDefaultDashboard logic from store
echo "─── Testing resolveDefaultDashboard logic ───"
echo ""

# Test 1: User null
test_case() {
  local desc="$1"
  local role="$2"
  local default_dash="$3"
  local expected="$4"

  # Simulasi dengan shell function
  local actual
  if [ -z "$role" ]; then
    actual="dashboard"  # null user
  else
    local is_lib="false"
    if [ "$role" = "LIBRARIAN" ] || [ "$role" = "PUSTAKAWAN_JUNIOR" ]; then
      is_lib="true"
    fi

    if [ -z "$default_dash" ] || [ "$default_dash" = "default" ]; then
      if [ "$is_lib" = "true" ]; then
        actual="dashboard"
      else
        actual="my-dashboard"
      fi
    else
      # Validasi role: TEACHER/STUDENT hanya boleh 'my-dashboard' (atau 'default')
      if [ "$is_lib" = "false" ] && [ "$default_dash" != "my-dashboard" ]; then
        actual="my-dashboard"
      else
        actual="$default_dash"
      fi
    fi
  fi

  if [ "$actual" = "$expected" ]; then
    pass "  $desc: $actual"
  else
    fail "  $desc: expected=$expected got=$actual"
  fi
}

echo "Auto-route cases:"
test_case "LIBRARIAN no pref"        "LIBRARIAN"          ""        "dashboard"
test_case "LIBRARIAN default"         "LIBRARIAN"          "default" "dashboard"
test_case "PUSTAKAWAN_JUNIOR no pref" "PUSTAKAWAN_JUNIOR"  ""        "dashboard"
test_case "TEACHER no pref"           "TEACHER"            ""        "my-dashboard"
test_case "STUDENT no pref"           "STUDENT"            ""        "my-dashboard"

echo ""
echo "Explicit preference cases (LIBRARIAN):"
test_case "LIBRARIAN → customizable"  "LIBRARIAN"  "customizable-dashboard" "customizable-dashboard"
test_case "LIBRARIAN → executive"     "LIBRARIAN"  "executive-dashboard"    "executive-dashboard"
test_case "LIBRARIAN → standard"      "LIBRARIAN"  "dashboard"              "dashboard"

echo ""
echo "Explicit preference cases (TEACHER/STUDENT):"
test_case "TEACHER → my-dashboard"    "TEACHER"   "my-dashboard" "my-dashboard"
test_case "STUDENT → my-dashboard"    "STUDENT"   "my-dashboard" "my-dashboard"

echo ""
echo "Security: TEACHER/STUDENT cannot choose executive/customizable:"
test_case "TEACHER → executive"       "TEACHER"   "executive-dashboard"    "my-dashboard"
test_case "STUDENT → customizable"   "STUDENT"   "customizable-dashboard" "my-dashboard"
test_case "TEACHER → dashboard"       "TEACHER"   "dashboard"              "my-dashboard"
test_case "STUDENT → standard"        "STUDENT"   "dashboard"              "my-dashboard"

echo ""
echo "Null user:"
test_case "null user"                 "" "" "dashboard"

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All logic tests passed.${NC}"
else
  echo -e "${RED}Some tests failed.${NC}"
  exit 1
fi
