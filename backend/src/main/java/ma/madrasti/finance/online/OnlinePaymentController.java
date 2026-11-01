package ma.madrasti.finance.online;

import ma.madrasti.audit.AuditAction;
import ma.madrasti.audit.AuditService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.finance.PaymentController.PaymentResponse;
import ma.madrasti.finance.PaymentMethod;
import ma.madrasti.finance.PaymentRepository;
import ma.madrasti.user.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;

/**
 * Paiement en ligne des échéances par les familles : ouverture d'une session chez le prestataire,
 * puis confirmation côté serveur auprès de ce prestataire (l'URL de retour seule ne prouve rien).
 */
@RestController
@RequestMapping("/api/payments")
@Transactional
public class OnlinePaymentController {

    public record Provider(String provider) {
    }

    /**
     * {@code formFields} : à poster vers {@code redirectUrl} (CMI) ; sinon simple redirection.
     * {@code session} permet à l'application mobile de confirmer le paiement au retour du navigateur.
     */
    public record CheckoutResponse(String session, String redirectUrl, java.util.Map<String, String> formFields) {
    }

    public record ConfirmRequest(@NotBlank String session) {
    }

    public record SessionView(String session, String provider, OnlinePayment.Status status, String label,
                              BigDecimal amount, String studentName, Long studentId) {
        static SessionView from(OnlinePayment online) {
            var payment = online.getPayment();
            return new SessionView(online.getSessionId(), online.getProvider(), online.getStatus(), payment.getLabel(),
                    payment.getAmount(), payment.getStudent().fullName(), payment.getStudent().getId());
        }
    }

    public record Confirmation(OnlinePayment.Status status, Long studentId, PaymentResponse payment) {
    }

    private final PaymentRepository payments;
    private final OnlinePaymentRepository online;
    private final PaymentGateway gateway;
    private final UserRepository users;
    private final MadrastiProperties properties;
    private final Clock clock;

    private final AuditService audit;
    private final tools.jackson.databind.json.JsonMapper json;

    public OnlinePaymentController(PaymentRepository payments, OnlinePaymentRepository online, PaymentGateway gateway,
                                   UserRepository users, MadrastiProperties properties, Clock clock, AuditService audit, tools.jackson.databind.json.JsonMapper json) {
        this.json = json;
        this.audit = audit;
        this.payments = payments;
        this.online = online;
        this.gateway = gateway;
        this.users = users;
        this.properties = properties;
        this.clock = clock;
    }

    @GetMapping("/online")
    public Provider provider() {
        return new Provider(gateway.provider());
    }

    /** Le parent de l'élève ouvre une session de paiement pour une échéance non réglée. */
    @PostMapping("/{id}/checkout")
    @PreAuthorize("hasRole('PARENT')")
    public CheckoutResponse checkout(@PathVariable Long id, @RequestParam(defaultValue = "web") String client) {
        var me = CurrentUser.get();
        var payment = payments.findById(id)
                .filter(p -> p.getStudent().getParent() != null && p.getStudent().getParent().getId().equals(me.id()))
                .orElseThrow(() -> new NotFoundException("payment", id));
        if (payment.getPaidAt() != null) {
            throw new ConflictException("error.payment.alreadyPaid");
        }
        var base = properties.payments().publicUrl();
        var mobile = "mobile".equals(client);
        // Sur mobile, le navigateur du téléphone n'a pas la session web : il termine sur une page « revenez dans l'application ».
        var returnUrl = mobile ? base + "/api/public/payments/done" : base + "/payments/return";
        var checkout = gateway.createCheckout(payment, "SCO-" + payment.getId(), returnUrl,
                mobile ? base + "/api/public/payments/done" : base + "/students/" + payment.getStudent().getId());
        var attempt = new OnlinePayment(payment, users.getReferenceById(me.id()), gateway.provider(), checkout.sessionId());
        if (!mobile) {
            online.save(attempt);
            return new CheckoutResponse(checkout.sessionId(), checkout.redirectUrl(), checkout.formFields());
        }
        attempt.fromMobile(checkout.formFields() == null ? null : json.writeValueAsString(checkout.formFields()));
        online.save(attempt);
        // Formulaire signé (CMI) : un lien suffit au téléphone, la page publique poste le formulaire.
        var redirect = checkout.formFields() == null ? checkout.redirectUrl()
                : base + "/api/public/payments/cmi/redirect/" + checkout.sessionId();
        return new CheckoutResponse(checkout.sessionId(), redirect, null);
    }

    @GetMapping("/online/sessions/{session}")
    @Transactional(readOnly = true)
    @PreAuthorize("hasRole('PARENT')")
    public SessionView session(@PathVariable String session) {
        return SessionView.from(mine(session));
    }

    /** Page de démonstration : valide le paiement fictif (refusé avec un vrai prestataire). */
    @PostMapping("/online/sessions/{session}/simulate")
    @PreAuthorize("hasRole('PARENT')")
    public SessionView simulate(@PathVariable String session) {
        var attempt = mine(session);
        if (!"simulated".equals(attempt.getProvider()) || !(gateway instanceof SimulatedPaymentGateway)) {
            throw new NotFoundException("payment", session);
        }
        attempt.approve();
        return SessionView.from(attempt);
    }

    /** Retour de la page de paiement : on demande au prestataire si la session est réellement payée. */
    @PostMapping("/online/confirm")
    @PreAuthorize("hasRole('PARENT')")
    public Confirmation confirm(@Valid @RequestBody ConfirmRequest request) {
        var attempt = online.lockBySessionId(request.session())
                .filter(o -> o.getPayer().getId().equals(CurrentUser.get().id()))
                .orElseThrow(() -> new NotFoundException("payment", request.session()));
        var payment = attempt.getPayment();
        var today = LocalDate.now(clock);
        if (attempt.getStatus() == OnlinePayment.Status.PENDING && gateway.isPaid(attempt)) {
            attempt.markPaid();
            if (payment.getPaidAt() == null) {
                payment.markPaid(today, PaymentMethod.ONLINE);
                audit.record(AuditAction.PAYMENT_ONLINE, payment.getStudent().fullName() + " — " + payment.getLabel(),
                        payment.getAmount() + " (" + attempt.getProvider() + " " + attempt.getSessionId() + ")");
            }
        }
        return new Confirmation(attempt.getStatus(), payment.getStudent().getId(), PaymentResponse.from(payment, today));
    }

    private OnlinePayment mine(String session) {
        return online.findBySessionId(session)
                .filter(o -> o.getPayer().getId().equals(CurrentUser.get().id()))
                .orElseThrow(() -> new NotFoundException("payment", session));
    }
}
