package com.portfolio.payment;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {
    public enum Status { AUTHORIZED, CAPTURED, PARTIALLY_REFUNDED, REFUNDED, DECLINED }

    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false) private String orderId;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal refundedAmount = BigDecimal.ZERO;
    @Column(nullable = false, length = 3) private String currency;
    @Column(nullable = false) private String paymentMethod;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Status status;
    @Column(nullable = false) private Instant createdAt = Instant.now();

    protected Payment() {}
    Payment(String orderId, BigDecimal amount, String currency, String paymentMethod, Status status) {
        this.orderId = orderId; this.amount = amount; this.currency = currency; this.paymentMethod = paymentMethod; this.status = status;
    }
    public UUID getId() { return id; }
    public String getOrderId() { return orderId; }
    public BigDecimal getAmount() { return amount; }
    public BigDecimal getRefundedAmount() { return refundedAmount; }
    public String getCurrency() { return currency; }
    public String getPaymentMethod() { return paymentMethod; }
    public Status getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    void setStatus(Status status) { this.status = status; }
    void addRefund(BigDecimal refund) { this.refundedAmount = this.refundedAmount.add(refund); }
}
