# Catalog Service

Owns products and prices in PostgreSQL. Redis provides a short product-detail cache, and catalog changes publish domain events.

- Port: `3002`
- Health: `GET /health`
- OpenAPI: `/openapi.json`
- API: CRUD under `/products`

Set `SEED_DEMO=true` to insert two sample products into an empty database.
