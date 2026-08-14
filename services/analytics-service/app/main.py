import asyncio
import json
import os
from contextlib import asynccontextmanager, suppress
from decimal import Decimal
from typing import Any, Optional

import psycopg
from aiokafka import AIOKafkaConsumer
from fastapi import FastAPI
from psycopg.rows import dict_row
from pydantic import BaseModel


class DomainEvent(BaseModel):
    id: str
    type: str
    source: str
    occurredAt: str
    data: dict[str, Any]


def money_from_event(event: DomainEvent) -> Decimal:
    if event.type != "payment.captured": return Decimal("0")
    return Decimal(str(event.data.get("amount", 0)))


class EventStore:
    def __init__(self) -> None: self.url = os.getenv("DATABASE_URL", "postgresql://commerce:commerce@localhost:5438/analytics")
    def initialize(self) -> None:
        with psycopg.connect(self.url) as connection:
            connection.execute("""CREATE TABLE IF NOT EXISTS analytics_events (
                id TEXT PRIMARY KEY, event_type TEXT NOT NULL, source TEXT NOT NULL,
                occurred_at TIMESTAMPTZ NOT NULL, data JSONB NOT NULL, revenue NUMERIC(12,2) NOT NULL DEFAULT 0
            )""")
    def save(self, event: DomainEvent) -> None:
        with psycopg.connect(self.url) as connection:
            connection.execute("INSERT INTO analytics_events (id,event_type,source,occurred_at,data,revenue) VALUES (%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING", (event.id, event.type, event.source, event.occurredAt, json.dumps(event.data), money_from_event(event)))
    def summary(self) -> dict[str, Any]:
        with psycopg.connect(self.url, row_factory=dict_row) as connection:
            totals = connection.execute("SELECT COUNT(*) AS total_events, COALESCE(SUM(revenue),0) AS captured_revenue FROM analytics_events").fetchone()
            counts = connection.execute("SELECT event_type, COUNT(*) AS count FROM analytics_events GROUP BY event_type ORDER BY count DESC, event_type").fetchall()
        assert totals is not None
        return {"totalEvents": totals["total_events"], "capturedRevenue": float(totals["captured_revenue"]), "eventsByType": counts}
    def recent(self) -> list[dict[str, Any]]:
        with psycopg.connect(self.url, row_factory=dict_row) as connection:
            return list(connection.execute("SELECT id,event_type AS type,source,occurred_at AS \"occurredAt\",data FROM analytics_events ORDER BY occurred_at DESC LIMIT 100").fetchall())


store = EventStore()
consumer: Optional[AIOKafkaConsumer] = None
consumer_task: Optional[asyncio.Task] = None


async def consume() -> None:
    assert consumer
    async for message in consumer:
        event = DomainEvent.model_validate_json(message.value)
        await asyncio.to_thread(store.save, event)


@asynccontextmanager
async def lifespan(_: FastAPI):
    global consumer, consumer_task
    await asyncio.to_thread(store.initialize)
    consumer = AIOKafkaConsumer("commerce.domain-events", bootstrap_servers=os.getenv("KAFKA_BROKERS", "localhost:19092"), group_id="analytics-service", auto_offset_reset="earliest")
    try:
        await consumer.start(); consumer_task = asyncio.create_task(consume())
    except Exception: consumer = None
    yield
    if consumer_task:
        consumer_task.cancel()
        with suppress(asyncio.CancelledError): await consumer_task
    if consumer: await consumer.stop()


app = FastAPI(title="Analytics Service", version="1.0.0", description="Read model built from commerce domain events", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]: return {"status": "ok", "service": "analytics-service"}


@app.get("/summary")
def summary() -> dict[str, Any]: return store.summary()


@app.get("/events")
def events() -> list[dict[str, Any]]: return store.recent()


@app.post("/events", status_code=202)
def ingest(event: DomainEvent) -> dict[str, str]: store.save(event); return {"status": "accepted", "eventId": event.id}
