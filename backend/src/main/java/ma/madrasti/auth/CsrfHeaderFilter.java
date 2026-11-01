package ma.madrasti.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Défense CSRF en profondeur (en plus de SameSite=Strict) : une requête modifiante authentifiée par cookie
 * doit porter l'en-tête X-Madrasti-Client. Un formulaire d'un autre site ne peut pas l'ajouter, et un appel
 * JavaScript cross-origin déclencherait un preflight CORS refusé.
 */
public class CsrfHeaderFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Madrasti-Client";
    private static final Set<String> SAFE = Set.of("GET", "HEAD", "OPTIONS");

    /** Routes qui ne s'appuient pas sur la session : un ancien cookie ne doit pas les bloquer. */
    private static boolean sessionless(String uri) {
        return uri.equals("/api/auth/login") || uri.equals("/api/auth/refresh") || uri.equals("/api/auth/logout") || uri.startsWith("/api/public/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var cookieAuthenticated = request.getHeader(HttpHeaders.AUTHORIZATION) == null && SessionCookie.read(request).isPresent();
        if (cookieAuthenticated && !SAFE.contains(request.getMethod()) && !sessionless(request.getRequestURI())
                && request.getHeader(HEADER) == null) {
            response.sendError(HttpStatus.FORBIDDEN.value(), "Missing " + HEADER + " header");
            return;
        }
        chain.doFilter(request, response);
    }
}
