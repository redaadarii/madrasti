package ma.madrasti.finance.online;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.finance.Payment;
import ma.madrasti.user.User;

/** Tentative de paiement en ligne d'une échéance, suivie par l'identifiant de session du prestataire. */
@Entity
@Table(name = "online_payments")
public class OnlinePayment extends BaseEntity {

    public enum Status { PENDING, PAID }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User payer;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false, unique = true)
    private String sessionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    /** {@code web} ou {@code mobile} : décide de la page affichée au retour du prestataire. */
    @Column(nullable = false)
    private String client = "web";

    /** CMI depuis le mobile : champs signés, rejoués par la page de redirection (JSON). */
    @Column(columnDefinition = "TEXT")
    private String formFields;

    /** Paiement simulé : validé sur la page de démonstration (le prestataire réel fait foi sinon). */
    @Column(nullable = false)
    private boolean approved;

    protected OnlinePayment() {
    }

    public OnlinePayment(Payment payment, User payer, String provider, String sessionId) {
        this.payment = payment;
        this.payer = payer;
        this.provider = provider;
        this.sessionId = sessionId;
    }

    public void fromMobile(String formFields) {
        this.client = "mobile";
        this.formFields = formFields;
    }

    public boolean isMobile() { return "mobile".equals(client); }
    public String getFormFields() { return formFields; }

    public void approve() { this.approved = true; }
    public void markPaid() { this.status = Status.PAID; }

    public Payment getPayment() { return payment; }
    public User getPayer() { return payer; }
    public String getProvider() { return provider; }
    public String getSessionId() { return sessionId; }
    public Status getStatus() { return status; }
    public boolean isApproved() { return approved; }
}
