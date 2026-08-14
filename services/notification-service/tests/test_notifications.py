from app.main import DomainEvent, notification_for


def test_order_confirmation_creates_simulated_email():
    event = DomainEvent(id="evt-1", type="order.confirmed", source="test", occurredAt="2026-01-01T00:00:00Z", data={"email": "shopper@example.com"})
    delivery = notification_for(event)
    assert delivery is not None
    assert delivery["recipient"] == "shopper@example.com"
    assert delivery["status"] == "SIMULATED_SENT"


def test_unrelated_event_is_ignored():
    event = DomainEvent(id="evt-2", type="catalog.product.created", source="test", occurredAt="2026-01-01T00:00:00Z", data={})
    assert notification_for(event) is None
