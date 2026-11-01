package ma.madrasti.auth;

import ma.madrasti.audit.AuditAction;
import ma.madrasti.audit.AuditService;
import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Jetons de rafraîchissement de l'application mobile, avec rotation : chaque utilisation révoque le jeton présenté
 * et en émet un nouveau. Présenter un jeton déjà utilisé signale un vol probable : toute la famille est révoquée.
 */
@Service
public class RefreshTokenService {

    /** Jeton émis : valeur en clair (rendue une seule fois au client) et utilisateur associé. */
    public record Issued(String value, User user, java.time.Instant expiresAt) {
    }

    public static class InvalidRefreshTokenException extends RuntimeException {
    }

    private final RefreshTokenRepository tokens;
    private final AuditService audit;
    private final MadrastiProperties properties;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository tokens, AuditService audit, MadrastiProperties properties, Clock clock) {
        this.tokens = tokens;
        this.audit = audit;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public Issued issue(User user) {
        return issue(user, UUID.randomUUID().toString());
    }

    /**
     * Échange un jeton valide contre un nouveau. La transaction est indépendante : une révocation pour réutilisation
     * doit rester enregistrée même si l'appelant échoue ensuite.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = InvalidRefreshTokenException.class)
    public Issued rotate(String value) {
        var now = clock.instant();
        var token = tokens.findByTokenHash(hash(value)).orElseThrow(InvalidRefreshTokenException::new);
        if (token.isRevoked()) {
            tokens.revokeFamily(token.getFamily(), now);
            audit.recordNow(AuditAction.TOKEN_REUSE, token.getUser().getEmail(), "famille " + token.getFamily());
            throw new InvalidRefreshTokenException();
        }
        if (token.isExpired(now) || !token.getUser().isActive()) {
            throw new InvalidRefreshTokenException();
        }
        token.revoke(now);
        return issue(token.getUser(), token.getFamily());
    }

    /** Déconnexion : le jeton présenté et ses successeurs éventuels ne servent plus. */
    @Transactional
    public void revoke(String value) {
        tokens.findByTokenHash(hash(value)).ifPresent(t -> tokens.revokeFamily(t.getFamily(), clock.instant()));
    }

    /** Mot de passe réinitialisé, compte désactivé ou supprimé : toutes les sessions mobiles sont closes. */
    @Transactional
    public void revokeAllOf(Long userId) {
        tokens.revokeAllOf(userId, clock.instant());
    }

    private Issued issue(User user, String family) {
        var bytes = new byte[32];
        random.nextBytes(bytes);
        var value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        var now = clock.instant();
        var expiresAt = now.plus(properties.security().refreshTtl());
        tokens.save(new RefreshToken(user, hash(value), family, now, expiresAt));
        return new Issued(value, user, expiresAt);
    }

    static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
