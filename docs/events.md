# Domain events

All services use the `commerce.domain-events` topic and the same language-neutral envelope:

```json
{
  "id": "2fd27cd0-52af-4a6e-92fb-2da5f6a9ec01",
  "type": "order.confirmed",
  "source": "order-service",
  "occurredAt": "2026-08-13T10:30:00Z",
  "data": { "orderId": "...", "total": 129.99 }
}
```

The envelope supports correlation, idempotent analytics ingestion, event-type routing, and cross-language serialization without introducing a schema-registry dependency into the starter application.

Current event families:

- `catalog.product.created`, `catalog.product.updated`, `catalog.product.deleted`
- `inventory.reserved`, `inventory.released`
- `order.confirmed`, `order.failed`, `order.cancelled`, `order.status.changed`
- `payment.authorized`, `payment.declined`, `payment.captured`, `payment.refunded`
- `notification.sent`

Consumers must ignore event types they do not understand. Analytics uses event IDs as database primary keys, so replaying an event is safe.
