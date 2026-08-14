#!/usr/bin/env sh
set -eu

API_URL="${API_URL:-http://localhost:8080}"
if ! curl -fsS "$API_URL/api/catalog/products" | grep -q '"sku":"KEYBOARD-001"'; then
  curl -fsS -X POST "$API_URL/api/catalog/products" -H 'content-type: application/json' \
    -d '{"sku":"KEYBOARD-001","name":"Mechanical Keyboard","description":"Hot-swappable 75% keyboard","price":129.99,"active":true}'
fi
curl -fsS -X PUT "$API_URL/api/inventory/KEYBOARD-001" -H 'content-type: application/json' -d '{"quantity":25}'
printf '\nDemo catalog and inventory seeded.\n'
