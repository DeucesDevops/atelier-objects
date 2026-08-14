# Order Service

Coordinates the checkout demo. It persists the order, reserves inventory, authorizes and captures a simulated payment, then emits a confirmation event. Cancellation refunds payment and releases inventory.

- Port: `3003`
- Health: `GET /health`
- OpenAPI: `/openapi.json`
- API: `GET/POST /`, `GET /:id`, `PATCH /:id/status`, `POST /:id/cancel`

All order endpoints except health require a JWT issued by the auth service.
