#!/bin/bash
# ═══════════════════════════════════════════════════════════
#  تست دودی — بررسی سلامت API بعد از دیپلای
#  اجرا: BASE_URL=https://crm.example.com/api/v1 \
#           ADMIN_EMAIL=admin@pouyaplastic.ir \
#           ADMIN_PASSWORD='Demo@1405' \
#           bash deploy/smoke-test.sh
# ═══════════════════════════════════════════════════════════

set -e
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

BASE_URL="${BASE_URL:?مقدار BASE_URL الزامی است}"
ADMIN_EMAIL="${ADMIN_EMAIL:?مقدار ADMIN_EMAIL الزامی است}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?مقدار ADMIN_PASSWORD الزامی است}"

PASS=0
FAIL=0

check() {
  local label="$1" method="$2" url="$3" data="$4" expected="$5"
  local response
  local auth_args=()
  if [ -n "${TOKEN:-}" ]; then auth_args=(-H "Authorization: Bearer $TOKEN"); fi

  if [ "$method" = "GET" ]; then
    response=$(curl -sf "${auth_args[@]}" "$BASE_URL$url" 2>/dev/null) || response=""
  else
    response=$(curl -sf -X "$method" "$BASE_URL$url" \
      "${auth_args[@]}" \
      -H 'Content-Type: application/json' \
      -d "$data" 2>/dev/null) || response=""
  fi

  if echo "$response" | grep -q "$expected"; then
    echo -e "${GREEN}  PASS${NC} $label"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}  FAIL${NC} $label"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "  ═══ تست دودی — Pouya Loyalty Club ═══"
echo "  URL: $BASE_URL"
echo ""

# ۱. Health
check "Health" GET "/health" "" '"success":true'

# ۲. Login
echo -n "  Login... "
TOKEN=$(curl -sf -X POST "$BASE_URL/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('access_token',''))" 2>/dev/null) || true

if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
  echo -e "${GREEN}PASS${NC}"
  PASS=$((PASS + 1))
else
  echo -e "${RED}FAIL${NC} (توکن دریافت نشد)"
  FAIL=$((FAIL + 1))
fi

# ۳. API endpoints
check "GET /loyalty/dashboard" GET "/loyalty/dashboard" "" "spendablePoints"
check "GET /loyalty/tiers" GET "/loyalty/tiers" "" "benefits"
check "GET /loyalty/rewards" GET "/loyalty/rewards" "" "costPoints"
check "GET /loyalty/transactions" GET "/loyalty/transactions" "" "data"
check "GET /leads" GET "/leads" "" "items"
check "GET /projects" GET "/projects" "" "items"
check "GET /customers" GET "/customers" "" "items"
check "GET /invoices" GET "/invoices" "" "items"
check "GET /stats/ceo-dashboard" GET "/stats/ceo-dashboard" "" "kpis"
check "GET /settings/loyalty" GET "/settings/loyalty" "" "purchaseRialPerPoint"
check "GET /notifications" GET "/notifications" "" "items"
check "GET /campaigns" GET "/campaigns" "" "items"
check "GET /users" GET "/users" "" "items"
check "GET /business/dashboard" GET "/business/dashboard" "" "sourcePerformance"
check "GET /business/products" GET "/business/products" "" "category"
check "GET /business/purchase-requests" GET "/business/purchase-requests" "" "trackingCode"
check "GET /business/shipments" GET "/business/shipments" "" "transportCost"

echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}  همه $PASS تست موفق بودند.${NC}"
else
  echo -e "${RED}  $PASS موفق / $FAIL ناموفق${NC}"
fi
echo ""
