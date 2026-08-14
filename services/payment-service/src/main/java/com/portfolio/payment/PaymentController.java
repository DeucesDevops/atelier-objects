package com.portfolio.payment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

record AuthorizeRequest(@NotBlank String orderId, @NotNull @DecimalMin("0.01") BigDecimal amount, @NotBlank @Size(min=3,max=3) String currency, @NotBlank String paymentMethod) {}
record RefundRequest(@NotNull @DecimalMin("0.01") BigDecimal amount) {}

@RestController
public class PaymentController {
    private final PaymentService service;
    PaymentController(PaymentService service) { this.service = service; }

    @GetMapping("/health") Map<String, String> health() { return Map.of("status", "ok", "service", "payment-service"); }
    @PostMapping("/authorizations") Payment authorize(@Valid @RequestBody AuthorizeRequest request) { return service.authorize(request); }
    @GetMapping("/payments/{id}") Payment get(@PathVariable UUID id) { return service.get(id); }
    @PostMapping("/payments/{id}/capture") Payment capture(@PathVariable UUID id) { return service.capture(id); }
    @PostMapping("/payments/{id}/refund") Payment refund(@PathVariable UUID id, @Valid @RequestBody RefundRequest request) { return service.refund(id, request.amount()); }
}
