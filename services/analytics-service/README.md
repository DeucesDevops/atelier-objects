# Analytics Service

FastAPI event consumer that stores an independent PostgreSQL read model. Its summary reports event counts and captured revenue without coupling to another service's database.

- Port: `8002`
- Health: `GET /health`
- OpenAPI: `/docs`
- API: `GET /summary`, `GET /events`, `POST /events`
- Consumes: `commerce.domain-events`

The manual ingest endpoint makes local demos and contract testing possible without Kafka.
