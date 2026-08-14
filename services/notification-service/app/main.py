import asyncio
import json
import os
from contextlib import asynccontextmanager, suppress
from datetime import datetime, timezone
from typing import Any, Optional
from uuid import uuid4

from aiokafka import AIOKafkaConsumer, AIOKafkaProducer
from fastapi import FastAPI
from pydantic import BaseModel


class DomainEvent(BaseModel):
    id: str
    type: str
    source: str
    occurredAt: str
    data: dict[str, Any]


def notification_for(event: DomainEvent) -> Optional[dict[str, Any]]:
    templates = {
        "order.confirmed": ("Order confirmed", "Your order has been confirmed and payment captured."),
        "order.failed": ("Order needs attention", "We could not complete your order. No inventory remains reserved."),
        "order.cancelled": ("Order cancelled", "Your order was cancelled and any captured payment was refunded."),
        "payment.refunded": ("Refund processed", "Your simulated refund has been processed."),
    }
    message = templates.get(event.type)
    if not message:
        return None
    return {
        "id": str(uuid4()), "channel": "email", "recipient": event.data.get("customerEmail", event.data.get("email", "demo-shopper@example.com")),
        "subject": message[0], "body": message[1], "sourceEventId": event.id,
        "status": "SIMULATED_SENT", "sentAt": datetime.now(timezone.utc).isoformat(),
    }


class NotificationRuntime:
    def __init__(self) -> None:
        self.deliveries: list[dict[str, Any]] = []
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.producer: Optional[AIOKafkaProducer] = None
        self.task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        brokers = os.getenv("KAFKA_BROKERS", "localhost:19092")
        self.consumer = AIOKafkaConsumer("commerce.domain-events", bootstrap_servers=brokers, group_id="notification-service", auto_offset_reset="earliest")
        self.producer = AIOKafkaProducer(bootstrap_servers=brokers)
        try:
            await self.consumer.start(); await self.producer.start()
            self.task = asyncio.create_task(self.consume())
        except Exception:
            await self.stop()

    async def consume(self) -> None:
        assert self.consumer
        async for message in self.consumer:
            await self.handle(DomainEvent.model_validate_json(message.value))

    async def handle(self, event: DomainEvent) -> Optional[dict[str, Any]]:
        delivery = notification_for(event)
        if not delivery:
            return None
        self.deliveries.insert(0, delivery)
        if self.producer:
            outgoing = {"id": str(uuid4()), "type": "notification.sent", "source": "notification-service", "occurredAt": datetime.now(timezone.utc).isoformat(), "data": delivery}
            await self.producer.send_and_wait("commerce.domain-events", json.dumps(outgoing).encode(), key=outgoing["id"].encode())
        return delivery

    async def stop(self) -> None:
        if self.task:
            self.task.cancel()
            with suppress(asyncio.CancelledError): await self.task
        if self.consumer: await self.consumer.stop()
        if self.producer: await self.producer.stop()


runtime = NotificationRuntime()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await runtime.start()
    yield
    await runtime.stop()


app = FastAPI(title="Notification Service", version="1.0.0", description="Event-driven simulated customer notifications", lifespan=lifespan)


@app.get("/health")
def health() -> dict[str, str]: return {"status": "ok", "service": "notification-service"}


@app.get("/deliveries")
def deliveries() -> list[dict[str, Any]]: return runtime.deliveries[:100]


@app.post("/events")
async def receive_event(event: DomainEvent) -> dict[str, Any]:
    delivery = await runtime.handle(event)
    return {"handled": delivery is not None, "delivery": delivery}
