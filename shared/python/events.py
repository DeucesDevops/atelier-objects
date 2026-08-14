from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4


@dataclass(frozen=True)
class DomainEvent:
    id: str
    type: str
    source: str
    occurred_at: str
    data: dict[str, Any]

    @classmethod
    def create(cls, event_type: str, source: str, data: dict[str, Any]) -> "DomainEvent":
        return cls(str(uuid4()), event_type, source, datetime.now(timezone.utc).isoformat(), data)

    def to_dict(self) -> dict[str, Any]:
        result = asdict(self)
        result["occurredAt"] = result.pop("occurred_at")
        return result
