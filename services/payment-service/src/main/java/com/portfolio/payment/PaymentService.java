package com.portfolio.payment;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.UUID;

@Service
public class PaymentService {
    private final PaymentRepository payments;
    private final PaymentEvents events;
    PaymentService(PaymentRepository payments, PaymentEvents events) { this.payments = payments; this.events = events; }

    Payment get(UUID id) { return payments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found")); }

    @Transactional
    Payment authorize(AuthorizeRequest request) {
        var declined = "decline".equalsIgnoreCase(request.paymentMethod());
        var payment = payments.save(new Payment(request.orderId(), request.amount(), request.currency().toUpperCase(), request.paymentMethod(), declined ? Payment.Status.DECLINED : Payment.Status.AUTHORIZED));
        events.publish(declined ? "payment.declined" : "payment.authorized", payment);
        if (declined) throw new ResponseStatusException(HttpStatus.PAYMENT_REQUIRED, "Simulated card decline");
        return payment;
    }

    @Transactional
    Payment capture(UUID id) {
        var payment = get(id);
        if (payment.getStatus() != Payment.Status.AUTHORIZED) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only authorized payments can be captured");
        payment.setStatus(Payment.Status.CAPTURED); payment = payments.save(payment); events.publish("payment.captured", payment); return payment;
    }

    @Transactional
    Payment refund(UUID id, BigDecimal amount) {
        var payment = get(id);
        if (payment.getStatus() != Payment.Status.CAPTURED && payment.getStatus() != Payment.Status.PARTIALLY_REFUNDED) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only captured payments can be refunded");
        if (amount.signum() <= 0 || payment.getRefundedAmount().add(amount).compareTo(payment.getAmount()) > 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid refund amount");
        payment.addRefund(amount);
        payment.setStatus(payment.getRefundedAmount().compareTo(payment.getAmount()) == 0 ? Payment.Status.REFUNDED : Payment.Status.PARTIALLY_REFUNDED);
        payment = payments.save(payment); events.publish("payment.refunded", payment); return payment;
    }
}
