package ma.madrasti.finance.online;

import ma.madrasti.finance.Payment;

/** Prestataire de paiement en ligne : Stripe Checkout, CMI ou paiement simulé. */
public interface PaymentGateway {

    /**
     * Session ouverte chez le prestataire : la famille est redirigée vers {@code redirectUrl}, par un simple lien
     * ou, si {@code formFields} est renseigné (CMI), par un formulaire POST signé envoyé à cette adresse.
     */
    record Checkout(String sessionId, String redirectUrl, java.util.Map<String, String> formFields) {
        public Checkout(String sessionId, String redirectUrl) {
            this(sessionId, redirectUrl, null);
        }
    }

    String provider();

    /**
     * @param returnUrl page de retour ; le prestataire y ajoute {@code ?session=<identifiant>}
     * @param cancelUrl page affichée si la famille abandonne
     */
    Checkout createCheckout(Payment payment, String reference, String returnUrl, String cancelUrl);

    /** Interroge le prestataire : seule source de vérité, jamais l'URL de retour. */
    boolean isPaid(OnlinePayment online);
}
