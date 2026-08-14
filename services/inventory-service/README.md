# Inventory Service

Owns stock levels and order reservations in PostgreSQL. Reservations and releases are transactional and publish domain events.

- Port: `3004`
- Health: `GET /health`
- OpenAPI: `/openapi.json`
- API: `GET /`, `PUT /:sku`, `POST /reservations`, `POST /reservations/:orderId/release`

The pessimistic database lock in the reservation path prevents two concurrent orders from consuming the same stock.
