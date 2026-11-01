package ma.madrasti.finance.online;

import tools.jackson.databind.JsonNode;
import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.finance.Payment;
import org.springframework.http.MediaType;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

import java.math.RoundingMode;

/**
 * Stripe Checkout (page de paiement hébergée par Stripe : aucune donnée de carte ne transite par Madrasti).
 * API REST appelée directement, comme pour Twilio : pas de SDK supplémentaire.
 */
public class StripePaymentGateway implements PaymentGateway {

    private final RestClient client;
    private final String currency;

    public StripePaymentGateway(MadrastiProperties.Payments properties, RestClient.Builder builder) {
        this.currency = properties.currency();
        this.client = builder.baseUrl(properties.stripe().apiBase())
                .defaultHeaders(h -> h.setBearerAuth(properties.stripe().secretKey()))
                .build();
    }

    @Override
    public String provider() {
        return "stripe";
    }

    @Override
    public Checkout createCheckout(Payment payment, String reference, String returnUrl, String cancelUrl) {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("mode", "payment");
        // Stripe remplace {CHECKOUT_SESSION_ID} par l'identifiant de la session au retour.
        form.add("success_url", returnUrl + "?session={CHECKOUT_SESSION_ID}");
        form.add("cancel_url", cancelUrl);
        form.add("client_reference_id", reference);
        form.add("metadata[paymentId]", String.valueOf(payment.getId()));
        form.add("line_items[0][quantity]", "1");
        form.add("line_items[0][price_data][currency]", currency);
        form.add("line_items[0][price_data][unit_amount]",
                payment.getAmount().movePointRight(2).setScale(0, RoundingMode.HALF_UP).toPlainString());
        form.add("line_items[0][price_data][product_data][name]",
                payment.getLabel() + " — " + payment.getStudent().fullName());
        var session = client.post().uri("/v1/checkout/sessions")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(JsonNode.class);
        return new Checkout(session.get("id").asString(), session.get("url").asString());
    }

    @Override
    public boolean isPaid(OnlinePayment online) {
        var session = client.get().uri("/v1/checkout/sessions/{id}", online.getSessionId())
                .retrieve()
                .body(JsonNode.class);
        return session != null && "paid".equals(session.path("payment_status").asString());
    }
}
