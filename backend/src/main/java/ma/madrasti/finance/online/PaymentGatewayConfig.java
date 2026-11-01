package ma.madrasti.finance.online;

import ma.madrasti.config.MadrastiProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;

@Configuration
class PaymentGatewayConfig {

    @Bean
    PaymentGateway paymentGateway(MadrastiProperties properties) {
        var payments = properties.payments();
        return switch (payments.provider()) {
            case "stripe" -> {
                if (payments.stripe() == null || payments.stripe().secretKey() == null || payments.stripe().secretKey().isBlank()) {
                    throw new IllegalStateException("STRIPE_SECRET_KEY est requis avec MADRASTI_PAYMENTS_PROVIDER=stripe");
                }
                yield new StripePaymentGateway(payments, RestClient.builder());
            }
            case "cmi" -> {
                var cmi = payments.cmi();
                if (cmi == null || blank(cmi.clientId()) || blank(cmi.storeKey())) {
                    throw new IllegalStateException("CMI_CLIENT_ID et CMI_STORE_KEY sont requis avec MADRASTI_PAYMENTS_PROVIDER=cmi");
                }
                yield new CmiPaymentGateway(payments);
            }
            case "simulated" -> new SimulatedPaymentGateway(payments);
            default -> throw new IllegalStateException("Prestataire de paiement inconnu : " + payments.provider());
        };
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
