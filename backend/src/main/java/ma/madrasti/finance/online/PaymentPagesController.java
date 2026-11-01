package ma.madrasti.finance.online;

import ma.madrasti.config.MadrastiProperties;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

import java.time.Clock;
import java.time.Duration;
import java.util.Map;

/**
 * Pages publiques du paiement depuis l'application mobile (ouvertes dans le navigateur du téléphone, sans session) :
 * envoi du formulaire signé au CMI, puis page de fin invitant à revenir dans l'application.
 * Pas de JavaScript : la CSP du site l'interdit, un bouton suffit.
 */
@RestController
@RequestMapping("/api/public/payments")
public class PaymentPagesController {

    /** Le formulaire signé n'est rejouable que peu de temps après l'ouverture du paiement. */
    private static final Duration REDIRECT_VALIDITY = Duration.ofMinutes(30);
    private static final TypeReference<Map<String, String>> FIELDS = new TypeReference<>() {
    };

    private final OnlinePaymentRepository online;
    private final MadrastiProperties properties;
    private final JsonMapper json;
    private final Clock clock;

    public PaymentPagesController(OnlinePaymentRepository online, MadrastiProperties properties, JsonMapper json, Clock clock) {
        this.online = online;
        this.properties = properties;
        this.json = json;
        this.clock = clock;
    }

    @GetMapping(value = "/cmi/redirect/{session}", produces = MediaType.TEXT_HTML_VALUE)
    @Transactional(readOnly = true)
    public ResponseEntity<String> cmiRedirect(@PathVariable String session) {
        var attempt = online.findBySessionId(session)
                .filter(o -> o.isMobile() && o.getFormFields() != null && "cmi".equals(o.getProvider()))
                .filter(o -> o.getStatus() == OnlinePayment.Status.PENDING)
                .filter(o -> o.getCreatedAt().plus(REDIRECT_VALIDITY).isAfter(clock.instant()));
        if (attempt.isEmpty()) {
            return ResponseEntity.status(404).contentType(MediaType.TEXT_HTML)
                    .body(page("Lien de paiement expiré", "<p>Relancez le paiement depuis l'application Madrasti.</p>"));
        }
        var fields = json.readValue(attempt.get().getFormFields(), FIELDS);
        var inputs = new StringBuilder();
        fields.forEach((name, value) -> inputs.append("<input type=\"hidden\" name=\"").append(HtmlUtils.htmlEscape(name))
                .append("\" value=\"").append(HtmlUtils.htmlEscape(value)).append("\">"));
        var amount = HtmlUtils.htmlEscape(fields.getOrDefault("amount", ""));
        var action = HtmlUtils.htmlEscape(properties.payments().cmi().gatewayUrl());
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(page("Paiement sécurisé",
                "<p>Montant : <strong>" + amount + " MAD</strong></p>"
                        + "<form method=\"post\" action=\"" + action + "\">" + inputs
                        + "<button type=\"submit\">Continuer vers le paiement CMI</button></form>"
                        + "<p class=\"small\">Vos données de carte sont saisies sur la page sécurisée du CMI, jamais dans Madrasti.</p>"));
    }

    @GetMapping(value = "/done", produces = MediaType.TEXT_HTML_VALUE)
    public String done() {
        return page("Paiement terminé",
                "<p>Vous pouvez fermer cette page et revenir dans l'application Madrasti : le paiement y sera confirmé.</p>"
                        + "<p lang=\"en\">Payment complete — you can close this page and return to the Madrasti app.</p>"
                        + "<p lang=\"ar\" dir=\"rtl\">اكتمل الأداء — يمكنك إغلاق هذه الصفحة والعودة إلى تطبيق سكولاريس.</p>");
    }

    private static String page(String title, String content) {
        return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><title>Madrasti — " + title + "</title>"
                + "<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;"
                + "box-sizing:border-box;font-family:-apple-system,system-ui,sans-serif;background:#f7f6fb;color:#1b1838;text-align:center}"
                + "main{max-width:420px}h1{color:#1e3a8a}button{border:0;border-radius:14px;padding:14px 22px;font:inherit;font-weight:600;"
                + "background:#1e3a8a;color:#fff;width:100%}.small{font-size:13px;color:#6b6889}</style></head>"
                + "<body><main><h1>" + title + "</h1>" + content + "</main></body></html>";
    }
}
