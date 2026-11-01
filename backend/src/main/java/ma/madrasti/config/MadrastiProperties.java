package ma.madrasti.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;
import java.util.List;

@ConfigurationProperties("madrasti")
public record MadrastiProperties(Security security, Cors cors, Live live, Storage storage, Sms sms,
                                 Translation translation, Payments payments, boolean seedDemoData) {

    /**
     * {@code cookieSecure} : cookie de session réservé à HTTPS (true en production).
     * Débits maximum par minute et par IP : connexion et formulaire public.
     * Application mobile : jeton d'accès court ({@code mobileAccessTtl}) renouvelé par un jeton de rafraîchissement ({@code refreshTtl}).
     */
    public record Security(String jwtSecret, Duration tokenTtl, boolean cookieSecure, int loginPerMinute,
                           int publicPerMinute, Duration mobileAccessTtl, Duration refreshTtl) {
    }

    public record Cors(List<String> allowedOrigins) {
    }

    /** Serveur Jitsi : meet.jit.si pour la démo, un Jitsi auto-hébergé ou JaaS en production. */
    public record Live(String jitsiBaseUrl) {
    }

    /** Traduction automatique des contenus (API Claude) : désactivée sans clé API. */
    public record Translation(String apiKey, String model, String effort, int perUserPerMinute) {
    }

    /**
     * Paiement en ligne : {@code simulated} (démonstration, aucun argent ne circule), {@code stripe}
     * (Stripe Checkout) ou {@code cmi} (CMI, cartes marocaines). {@code publicUrl} : adresse du site, pour le retour après paiement.
     */
    public record Payments(String provider, String publicUrl, String currency, Stripe stripe, Cmi cmi) {
        public record Stripe(String secretKey, String apiBase) {
        }

        /** CMI (Centre Monétique Interbancaire) : identifiants fournis par le CMI à la signature du contrat. */
        public record Cmi(String clientId, String storeKey, String gatewayUrl) {
        }
    }

    /** Dossier des fichiers déposés (photos, supports de cours). */
    public record Storage(String dir) {
    }

    /**
     * SMS : {@code log} (développement, rien n'est envoyé) ou {@code twilio}.
     * {@code absenceAlerts} prévient automatiquement les parents à chaque absence saisie.
     */
    public record Sms(String provider, boolean absenceAlerts, Twilio twilio) {
        public record Twilio(String accountSid, String authToken, String from) {
        }
    }
}
