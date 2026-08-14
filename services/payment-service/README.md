# Payment Service

Java 21 and Spring Boot service for simulated authorization, capture, and refund. Payment state is persisted in PostgreSQL and each transition emits a domain event.

- Port: `8085`
- Health: `GET /health` and `/actuator/health`
- Swagger: `/docs`
- API: `POST /authorizations`, `GET /payments/{id}`, `POST /payments/{id}/capture`, `POST /payments/{id}/refund`

Use `paymentMethod: "decline"` to exercise the failed-checkout compensation flow. No real card details or payment provider are involved.
