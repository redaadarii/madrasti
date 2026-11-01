package ma.madrasti.finance.online;

import ma.madrasti.config.MadrastiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/**
 * Notifications du CMI (routes publiques : le CMI ne porte pas la session de l'utilisateur).
 * Seule la signature fait foi ; un paiement n'est validé que si {@code ProcReturnCode} vaut « 00 ».
 */
@RestController
@RequestMapping("/api/public/payments/cmi")
@ConditionalOnProperty(name = "madrasti.payments.provider", havingValue = "cmi")
@Transactional
public class CmiNotificationController {

    private static final Logger log = LoggerFactory.getLogger(CmiNotificationController.class);

    private final CmiPaymentGateway gateway;
    private final OnlinePaymentRepository online;
    private final String publicUrl;

    public CmiNotificationController(PaymentGateway gateway, OnlinePaymentRepository online, MadrastiProperties properties) {
        this.gateway = (CmiPaymentGateway) gateway;
        this.online = online;
        this.publicUrl = properties.payments().publicUrl();
    }

    /**
     * Callback de serveur à serveur. Réponse attendue par le CMI : « ACTION=POSTAUTH » pour encaisser
     * la pré-autorisation, « APPROVED » pour accuser réception d'un refus, « FAILURE » si la notification est rejetée.
     */
    @PostMapping(path = "/callback", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE, produces = MediaType.TEXT_PLAIN_VALUE)
    public String callback(@RequestParam MultiValueMap<String, String> form) {
        var params = flatten(form);
        if (!gateway.isAuthentic(params)) {
            log.warn("Notification CMI rejetée : signature invalide (oid={})", params.get("oid"));
            return "FAILURE";
        }
        var attempt = online.lockBySessionId(params.getOrDefault("oid", "")).orElse(null);
        if (attempt == null) {
            return "FAILURE";
        }
        if (!"00".equals(params.get("ProcReturnCode"))) {
            return "APPROVED";
        }
        attempt.approve();
        return "ACTION=POSTAUTH";
    }

    /** Retour du navigateur (okUrl / failUrl) : on valide si la notification est authentique, puis page de confirmation. */
    @PostMapping(path = "/return", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<Void> browserReturn(@RequestParam MultiValueMap<String, String> form) {
        var params = flatten(form);
        var oid = params.getOrDefault("oid", "");
        var attempt = online.lockBySessionId(oid);
        if (gateway.isAuthentic(params) && "00".equals(params.get("ProcReturnCode"))) {
            attempt.ifPresent(OnlinePayment::approve);
        }
        var page = attempt.map(OnlinePayment::isMobile).orElse(false) ? "/api/public/payments/done" : "/payments/return";
        return ResponseEntity.status(HttpStatus.SEE_OTHER)
                .header(HttpHeaders.LOCATION, URI.create(publicUrl + page + "?session="
                        + URLEncoder.encode(oid, StandardCharsets.UTF_8)).toString())
                .build();
    }

    private static Map<String, String> flatten(MultiValueMap<String, String> form) {
        var params = new HashMap<String, String>();
        form.forEach((name, values) -> params.put(name, values.isEmpty() ? "" : values.getFirst()));
        return params;
    }
}
