package ma.madrasti.finance;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class PaymentTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 30);

    @Test
    void statusIsDerivedFromDueDateAndPayment() {
        var late = new Payment(null, "Octobre", BigDecimal.TEN, TODAY.minusDays(1));
        var upcoming = new Payment(null, "Novembre", BigDecimal.TEN, TODAY.plusDays(5));

        assertThat(late.status(TODAY)).isEqualTo(Payment.Status.OVERDUE);
        assertThat(upcoming.status(TODAY)).isEqualTo(Payment.Status.PENDING);

        late.markPaid(TODAY, PaymentMethod.CASH);
        assertThat(late.status(TODAY)).isEqualTo(Payment.Status.PAID);
    }
}
