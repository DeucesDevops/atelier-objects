from decimal import Decimal
from app.main import DomainEvent, money_from_event


def test_captured_payment_contributes_revenue():
    event = DomainEvent(id="evt-1", type="payment.captured", source="payment-service", occurredAt="2026-01-01T00:00:00Z", data={"amount": "129.99"})
    assert money_from_event(event) == Decimal("129.99")


def test_authorization_is_not_revenue():
    event = DomainEvent(id="evt-2", type="payment.authorized", source="payment-service", occurredAt="2026-01-01T00:00:00Z", data={"amount": "129.99"})
    assert money_from_event(event) == Decimal("0")
