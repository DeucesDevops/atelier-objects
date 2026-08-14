package com.portfolio.payment;

import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Component
public class PaymentEvents {
    private final KafkaTemplate<String, Object> kafka;
    PaymentEvents(KafkaTemplate<String, Object> kafka) { this.kafka = kafka; }
    void publish(String type, Payment payment) {
        var event = Map.of("id", UUID.randomUUID().toString(), "type", type, "source", "payment-service", "occurredAt", Instant.now().toString(), "data", payment);
        try { kafka.send("commerce.domain-events", payment.getId().toString(), event); } catch (RuntimeException ignored) { /* persistence remains available while broker reconnects */ }
    }
}
