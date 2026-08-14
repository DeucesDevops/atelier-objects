# API Gateway

NestJS edge service that exposes one local entry point and forwards `/api/{service}/...` requests to the owning service. It deliberately contains no business logic.

- Port: `8080`
- Health: `GET /health`
- OpenAPI: `/openapi.json`
- Routes: `/api/auth`, `/api/catalog`, `/api/orders`, `/api/inventory`, `/api/payments`, `/api/notifications`, `/api/analytics`

Run from the repository root with `npm install`, then `npm run start:gateway`.
