package ma.madrasti.finance.online;

import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.finance.Payment;

import java.util.UUID;

/** Démonstration : une page de Madrasti imite le formulaire de carte, aucun argent ne circule. */
public class SimulatedPaymentGateway implements PaymentGateway {

    private final String publicUrl;

    public SimulatedPaymentGateway(MadrastiProperties.Payments properties) {
        this.publicUrl = properties.publicUrl();
    }

    @Override
    public String provider() {
        return "simulated";
    }

    @Override
    public Checkout createCheckout(Payment payment, String reference, String returnUrl, String cancelUrl) {
        var session = "sim_" + UUID.randomUUID();
        return new Checkout(session, publicUrl + "/pay/simulated?session=" + session);
    }

    @Override
    public boolean isPaid(OnlinePayment online) {
        return online.isApproved();
    }
}
