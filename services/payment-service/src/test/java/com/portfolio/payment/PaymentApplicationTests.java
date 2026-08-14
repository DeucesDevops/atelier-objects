package com.portfolio.payment;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PaymentApplicationTests {
    @Test void moneyUsesDecimalArithmetic() {
        assertEquals(new BigDecimal("129.99"), new BigDecimal("100.00").add(new BigDecimal("29.99")));
    }
}
