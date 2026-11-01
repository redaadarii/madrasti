package ma.madrasti.audit;

import jakarta.persistence.*;

import java.time.Instant;

/** Trace immuable : aucune mise à jour, aucune suppression par l'application. */
@Entity
@Table(name = "audit_events")
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false)
    private AuditAction action;

    @Column(updatable = false)
    private Long actorId;

    @Column(updatable = false)
    private String actorEmail;

    @Column(updatable = false)
    private String target;

    @Column(updatable = false)
    private String detail;

    @Column(updatable = false)
    private String ip;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected AuditEvent() {
    }

    AuditEvent(AuditAction action, Long actorId, String actorEmail, String target, String detail, String ip, Instant createdAt) {
        this.action = action;
        this.actorId = actorId;
        this.actorEmail = actorEmail;
        this.target = truncate(target, 160);
        this.detail = truncate(detail, 300);
        this.ip = ip;
        this.createdAt = createdAt;
    }

    private static String truncate(String value, int max) {
        return value == null || value.length() <= max ? value : value.substring(0, max);
    }

    public Long getId() { return id; }
    public AuditAction getAction() { return action; }
    public Long getActorId() { return actorId; }
    public String getActorEmail() { return actorEmail; }
    public String getTarget() { return target; }
    public String getDetail() { return detail; }
    public String getIp() { return ip; }
    public Instant getCreatedAt() { return createdAt; }
}
