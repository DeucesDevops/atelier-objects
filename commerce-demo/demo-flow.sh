#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://localhost:8080}"
EMAIL="demo-$(date +%s)@example.com"
AUTH=$(curl -fsS -X POST "$API_URL/api/auth/register" -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"Portfolio123!\",\"name\":\"Demo Shopper\"}")
TOKEN=$(printf '%s' "$AUTH" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
curl -fsS -X POST "$API_URL/api/orders" -H 'content-type: application/json' -H "authorization: Bearer $TOKEN" \
  -d '{"items":[{"sku":"KEYBOARD-001","quantity":1,"unitPrice":129.99}],"paymentMethod":"demo-card"}'
printf '\nOrder flow completed for %s.\n' "$EMAIL"
