package ma.madrasti.auth;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;

/**
 * En-tête Authorization (clients API, tests) en priorité, sinon cookie de session (navigateur).
 * Le cookie est ignoré sur les routes sans session : un cookie périmé ou signé avec une ancienne clé
 * (rotation du secret JWT) ne doit jamais empêcher de se reconnecter ni de se déconnecter.
 */
public class CookieOrHeaderTokenResolver implements BearerTokenResolver {

    private final DefaultBearerTokenResolver header = new DefaultBearerTokenResolver();

    @Override
    public String resolve(HttpServletRequest request) {
        var fromHeader = header.resolve(request);
        if (fromHeader != null || isSessionless(request.getRequestURI())) {
            return fromHeader;
        }
        return SessionCookie.read(request).orElse(null);
    }

    private static boolean isSessionless(String uri) {
        return uri.equals("/api/auth/login") || uri.equals("/api/auth/refresh") || uri.equals("/api/auth/logout") || uri.startsWith("/api/public/");
    }
}
