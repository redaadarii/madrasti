package ma.madrasti.auth;

import ma.madrasti.user.Role;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/** Identité de l'appelant, extraite du JWT courant. */
public record CurrentUser(Long id, Role role) {

    public static CurrentUser get() {
        if (!(SecurityContextHolder.getContext().getAuthentication().getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException("Aucun utilisateur authentifié");
        }
        return new CurrentUser(Long.valueOf(jwt.getSubject()), Role.valueOf(jwt.getClaimAsString("role")));
    }

    public boolean isStaff() {
        return role == Role.ADMIN || role == Role.DIRECTOR || role == Role.TEACHER;
    }
}
