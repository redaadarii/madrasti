package ma.madrasti.auth;

import jakarta.persistence.*;
import ma.madrasti.user.User;

import java.time.Instant;

/** Jeton de rafraîchissement : seul son hash SHA-256 est conservé ; tous ceux d'une même connexion forment une famille. */
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @Column(nullable = false, unique = true)
    private String tokenHash;

    @Column(nullable = false)
    private String family;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant revokedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected RefreshToken() {
    }

    RefreshToken(User user, String tokenHash, String family, Instant createdAt, Instant expiresAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.family = family;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    boolean isRevoked() { return revokedAt != null; }
    boolean isExpired(Instant now) { return !expiresAt.isAfter(now); }
    void revoke(Instant now) { if (revokedAt == null) revokedAt = now; }

    public User getUser() { return user; }
    public String getFamily() { return family; }
    public Instant getExpiresAt() { return expiresAt; }
}
