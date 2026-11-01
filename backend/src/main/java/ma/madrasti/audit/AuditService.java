package ma.madrasti.audit;

import jakarta.servlet.http.HttpServletRequest;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.user.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.Clock;

/**
 * Journal d'audit. {@link #record} écrit dans la transaction de l'action (rien n'est tracé si elle échoue) ;
 * {@link #recordNow} écrit dans sa propre transaction, pour les connexions refusées notamment.
 */
@Service
public class AuditService {

    private final AuditEventRepository events;
    private final UserRepository users;
    private final Clock clock;

    public AuditService(AuditEventRepository events, UserRepository users, Clock clock) {
        this.events = events;
        this.users = users;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRED)
    public void record(AuditAction action, String target, String detail) {
        Long actorId = null;
        String email = null;
        if (SecurityContextHolder.getContext().getAuthentication() != null
                && SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof Jwt jwt) {
            actorId = CurrentUser.get().id();
            email = jwt.getClaimAsString("email");
        }
        events.save(new AuditEvent(action, actorId, email, target, detail, clientIp(), clock.instant()));
    }

    /** Hors transaction de l'appelant : la trace reste même si l'action lève une exception. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordNow(AuditAction action, String actorEmail, String detail) {
        var actorId = actorEmail == null ? null : users.findByEmailIgnoreCase(actorEmail).map(u -> u.getId()).orElse(null);
        events.save(new AuditEvent(action, actorId, actorEmail == null ? null : actorEmail.toLowerCase(), null, detail,
                clientIp(), clock.instant()));
    }

    /** Adresse du client (derrière nginx, les en-têtes X-Forwarded-* sont pris en compte en production). */
    private static String clientIp() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attributes) {
            HttpServletRequest request = attributes.getRequest();
            return request.getRemoteAddr();
        }
        return null;
    }
}
