# Auth Service

Owns shopper identities in PostgreSQL. It supports registration, login, JWT access tokens, and a current-user endpoint; Redis stores an optional short-lived session marker.

- Port: `3001`
- Health: `GET /health`
- OpenAPI: `/openapi.json`
- API: `POST /register`, `POST /login`, `GET /me`

Copy `.env.example` to `.env`, install root dependencies, and run `npm run start:dev` in this folder.
