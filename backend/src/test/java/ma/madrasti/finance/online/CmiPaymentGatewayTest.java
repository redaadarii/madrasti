package ma.madrasti.finance.online;

import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.finance.Payment;
import ma.madrasti.school.Classroom;
import ma.madrasti.school.School;
import ma.madrasti.student.Student;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CmiPaymentGatewayTest {

    private static final String STORE_KEY = "TEST1234|key\\";

    private final CmiPaymentGateway gateway = new CmiPaymentGateway(new MadrastiProperties.Payments("cmi", "https://ecole.example",
            "mad", null, new MadrastiProperties.Payments.Cmi("600000000", STORE_KEY, "https://testpayment.cmi.co.ma/fim/est3Dgate")));

    /** Vecteur calculé indépendamment (même algorithme que le client PHP de référence). */
    @Test
    void signsLikeTheReferenceImplementation() {
        var params = Map.of("clientid", "600000000", "amount", "120.50", "oid", "SCO-1-abc", "okUrl", "https://ecole.example/ok",
                "TranType", "PreAuth", "BillToName", "Famille | Adari\\", "rnd", "123", "currency", "504",
                "encoding", "UTF-8", "hash", "ignoré");

        assertThat(CmiPaymentGateway.hash(params, STORE_KEY))
                .isEqualTo("aCyQHuuQQqgYxG1zX4SCwFTrRWovSgmrwSGwCjBUCD+ABcyfqU6wmEjjxrzXOwxneoLHXQ7mGELRu5OwfN6ifA==");
    }

    @Test
    void checkoutPostsASignedFormToTheGatewayWithAUniqueOrderId() {
        var first = gateway.createCheckout(payment(), "SCO-7", "https://ecole.example/payments/return", "https://ecole.example/students/1");
        var second = gateway.createCheckout(payment(), "SCO-7", "https://ecole.example/payments/return", "https://ecole.example/students/1");

        assertThat(first.redirectUrl()).isEqualTo("https://testpayment.cmi.co.ma/fim/est3Dgate");
        assertThat(first.sessionId()).startsWith("SCO-7-").isEqualTo(first.formFields().get("oid")).isNotEqualTo(second.sessionId());
        assertThat(first.formFields())
                .containsEntry("amount", "1500.50")
                .containsEntry("currency", "504")
                .containsEntry("storetype", "3D_PAY_HOSTING")
                .containsEntry("callbackUrl", "https://ecole.example/api/public/payments/cmi/callback");
        assertThat(gateway.isAuthentic(first.formFields())).isTrue();
    }

    @Test
    void aTamperedNotificationIsRejected() {
        var params = new HashMap<>(Map.of("oid", "SCO-1-x", "amount", "10.00", "ProcReturnCode", "00"));
        params.put("HASH", CmiPaymentGateway.hash(params, STORE_KEY));
        assertThat(gateway.isAuthentic(params)).isTrue();

        params.put("amount", "1.00");
        assertThat(gateway.isAuthentic(params)).isFalse();
        params.remove("HASH");
        assertThat(gateway.isAuthentic(params)).isFalse();
    }

    private static Payment payment() {
        var classroom = new Classroom(new School("Les Orangers", "Casablanca"), "CM1-B", "CM1", "2026-2027");
        return new Payment(new Student("SC-1", "Adam", "Adari", classroom), "Frais de scolarité",
                new BigDecimal("1500.5"), LocalDate.of(2026, 11, 5));
    }
}
