package ma.madrasti.finance;

import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.finance.online.OnlinePayment;
import ma.madrasti.finance.online.StripePaymentGateway;
import ma.madrasti.school.Classroom;
import ma.madrasti.school.School;
import ma.madrasti.student.Student;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class StripePaymentGatewayTest {

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer stripe = MockRestServiceServer.bindTo(builder).build();
    private final StripePaymentGateway gateway = new StripePaymentGateway(new MadrastiProperties.Payments("stripe",
            "https://ecole.example", "mad", new MadrastiProperties.Payments.Stripe("sk_test_123", "https://api.stripe.test"), null), builder);

    @Test
    void opensACheckoutSessionInCentimesWithTheSessionPlaceholderInTheReturnUrl() {
        stripe.expect(requestTo("https://api.stripe.test/v1/checkout/sessions"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header("Authorization", "Bearer sk_test_123"))
                .andExpect(content().string(allOf(
                        containsString("unit_amount%5D=150050"),
                        containsString("currency%5D=mad"),
                        containsString("success_url=https%3A%2F%2Fecole.example%2Fpayments%2Freturn%3Fsession%3D%7BCHECKOUT_SESSION_ID%7D"))))
                .andRespond(withSuccess("{\"id\":\"cs_test_1\",\"url\":\"https://checkout.stripe.com/c/cs_test_1\"}", MediaType.APPLICATION_JSON));

        var checkout = gateway.createCheckout(payment(), "SCO-1", "https://ecole.example/payments/return", "https://ecole.example/students/1");

        assertThat(checkout.sessionId()).isEqualTo("cs_test_1");
        assertThat(checkout.redirectUrl()).isEqualTo("https://checkout.stripe.com/c/cs_test_1");
        stripe.verify();
    }

    @Test
    void onlyAPaidSessionCountsAsPaid() {
        stripe.expect(requestTo("https://api.stripe.test/v1/checkout/sessions/cs_open"))
                .andRespond(withSuccess("{\"id\":\"cs_open\",\"payment_status\":\"unpaid\"}", MediaType.APPLICATION_JSON));
        stripe.expect(requestTo("https://api.stripe.test/v1/checkout/sessions/cs_paid"))
                .andRespond(withSuccess("{\"id\":\"cs_paid\",\"payment_status\":\"paid\"}", MediaType.APPLICATION_JSON));

        assertThat(gateway.isPaid(new OnlinePayment(payment(), null, "stripe", "cs_open"))).isFalse();
        assertThat(gateway.isPaid(new OnlinePayment(payment(), null, "stripe", "cs_paid"))).isTrue();
    }

    private static Payment payment() {
        var classroom = new Classroom(new School("Les Orangers", "Casablanca"), "CM1-B", "CM1", "2026-2027");
        return new Payment(new Student("SC-1", "Adam", "Adari", classroom), "Frais de scolarité — novembre",
                new BigDecimal("1500.50"), LocalDate.of(2026, 11, 5));
    }
}
