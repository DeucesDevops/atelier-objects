#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://localhost:8080}"
EMAIL="e2e-shopper-$(date +%s)@example.com"
PASSWORD="Portfolio123!"
PASS_COUNT=0

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf 'PASS  %s\n' "$1"
}

expect_contains() {
  value="$1"
  expected="$2"
  label="$3"
  if printf '%s' "$value" | grep -q "$expected"; then
    pass "$label"
  else
    printf 'FAIL  %s\nExpected to find: %s\nResponse: %s\n' "$label" "$expected" "$value" >&2
    exit 1
  fi
}

printf 'Commerce end-to-end workflow against %s\n\n' "$API_URL"

for health_path in \
  /health \
  /api/auth/health \
  /api/catalog/health \
  /api/inventory/health \
  /api/orders/health \
  /api/payments/actuator/health \
  /api/notifications/health \
  /api/analytics/health
do
  curl -fsS "$API_URL$health_path" >/dev/null
done
pass 'all eight application services are healthy'

CATALOG=$(curl -fsS "$API_URL/api/catalog/products")
expect_contains "$CATALOG" '"sku":"KEYBOARD-001"' 'catalog lists seeded products'
expect_contains "$CATALOG" '"sku":"SPEAKER-001"' 'expanded storefront collection is available'

AUTH=$(curl -fsS -X POST "$API_URL/api/auth/register" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"End-to-End Shopper\"}")
TOKEN=$(printf '%s' "$AUTH" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  printf 'FAIL  registration did not return an access token\n' >&2
  exit 1
fi
pass 'shopper registration returns an access token'

PROFILE=$(curl -fsS "$API_URL/api/auth/me" -H "authorization: Bearer $TOKEN")
expect_contains "$PROFILE" "$EMAIL" 'authenticated profile can be loaded'

LOGIN=$(curl -fsS -X POST "$API_URL/api/auth/login" \
  -H 'content-type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
expect_contains "$LOGIN" '"accessToken"' 'returning shopper can sign in'

HAPPY_ORDER=$(curl -fsS -X POST "$API_URL/api/orders" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"items":[{"sku":"DESKMAT-001","quantity":1,"unitPrice":49}],"paymentMethod":"demo-card"}')
HAPPY_ORDER_ID=$(printf '%s' "$HAPPY_ORDER" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')
expect_contains "$HAPPY_ORDER" '"status":"CONFIRMED"' 'successful checkout confirms the order'
expect_contains "$HAPPY_ORDER" '"paymentId"' 'successful checkout captures a simulated payment'

ORDER_DETAIL=$(curl -fsS "$API_URL/api/orders/$HAPPY_ORDER_ID" -H "authorization: Bearer $TOKEN")
expect_contains "$ORDER_DETAIL" '"status":"CONFIRMED"' 'confirmed order can be tracked'

NOTIFICATION_FOUND=false
attempt=0
while [ "$attempt" -lt 10 ]; do
  DELIVERIES=$(curl -fsS "$API_URL/api/notifications/deliveries")
  if printf '%s' "$DELIVERIES" | grep -q "$EMAIL"; then
    NOTIFICATION_FOUND=true
    break
  fi
  attempt=$((attempt + 1))
  sleep 1
done
if [ "$NOTIFICATION_FOUND" = true ]; then pass 'order event produces a customer notification'; else printf 'FAIL  order notification was not consumed\n' >&2; exit 1; fi

CANCELLED=$(curl -fsS -X POST "$API_URL/api/orders/$HAPPY_ORDER_ID/cancel" -H "authorization: Bearer $TOKEN")
expect_contains "$CANCELLED" '"status":"CANCELLED"' 'confirmed order can be cancelled and refunded'

DECLINE_STATUS=$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$API_URL/api/orders" \
  -H 'content-type: application/json' \
  -H "authorization: Bearer $TOKEN" \
  -d '{"items":[{"sku":"LAMP-001","quantity":1,"unitPrice":149}],"paymentMethod":"decline"}')
if [ "$DECLINE_STATUS" = 502 ]; then pass 'declined payment returns a checkout failure'; else printf 'FAIL  expected declined checkout HTTP 502, got %s\n' "$DECLINE_STATUS" >&2; exit 1; fi

ORDERS=$(curl -fsS "$API_URL/api/orders" -H "authorization: Bearer $TOKEN")
expect_contains "$ORDERS" '"status":"FAILED"' 'declined checkout is recorded as a failed order'

INVENTORY=$(curl -fsS "$API_URL/api/inventory")
LAMP_STOCK=$(printf '%s' "$INVENTORY" | sed -n 's/.*"sku":"LAMP-001","available":\([0-9]*\),"reserved":\([0-9]*\).*/\1:\2/p')
expect_contains "$LAMP_STOCK" ':0' 'declined checkout releases its inventory reservation'

ANALYTICS=$(curl -fsS "$API_URL/api/analytics/summary")
expect_contains "$ANALYTICS" '"totalEvents"' 'analytics consumes commerce events'
expect_contains "$ANALYTICS" '"capturedRevenue"' 'analytics reports captured revenue'

printf '\n%d checks passed for %s.\n' "$PASS_COUNT" "$EMAIL"
