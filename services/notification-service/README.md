# Notification Service

FastAPI consumer that turns order and payment events into simulated email deliveries. It never contacts a real email provider, making the demo safe to run.

- Port: `8001`
- Health: `GET /health`
- OpenAPI: `/docs`
- API: `GET /deliveries`, `POST /events` for manual demonstrations
- Consumes: `commerce.domain-events`

Run with `pip install -r requirements.txt` and `uvicorn app.main:app --reload --port 8001`.
