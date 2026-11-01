package ma.madrasti.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.servlet.support.RequestContextUtils;

import java.io.IOException;
import java.time.Clock;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Limite le débit des routes exposées aux robots : connexion (force brute) et formulaire public
 * de pré-inscription (spam). Fenêtre fixe d'une minute par adresse IP, en mémoire.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private record Window(long minute, AtomicInteger count) {
    }

    private final Map<String, Window> windows = new ConcurrentHashMap<>();
    private final int loginPerMinute;
    private final int publicPerMinute;
    private final MessageSource messages;
    private final Clock clock;

    public RateLimitFilter(int loginPerMinute, int publicPerMinute, MessageSource messages, Clock clock) {
        this.loginPerMinute = loginPerMinute;
        this.publicPerMinute = publicPerMinute;
        this.messages = messages;
        this.clock = clock;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || limitFor(request.getRequestURI()) == 0;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var limit = limitFor(request.getRequestURI());
        var minute = clock.millis() / 60_000;
        var key = (request.getRequestURI().startsWith("/api/auth") ? "login:" : "public:") + request.getRemoteAddr();
        var window = windows.compute(key, (k, w) -> w == null || w.minute() != minute ? new Window(minute, new AtomicInteger()) : w);
        if (window.count().incrementAndGet() > limit) {
            var locale = RequestContextUtils.getLocale(request);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setHeader("Retry-After", String.valueOf(60 - (clock.millis() / 1000) % 60));
            response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
            response.setCharacterEncoding("UTF-8");
            var detail = messages.getMessage("error.tooManyRequests", null, locale).replace("\"", "'");
            response.getWriter().write("{\"status\":429,\"title\":\"Too Many Requests\",\"detail\":\"" + detail + "\"}");
            return;
        }
        if (windows.size() > 10_000) {
            windows.entrySet().removeIf(e -> e.getValue().minute() != minute);
        }
        chain.doFilter(request, response);
    }

    private int limitFor(String uri) {
        if (uri.equals("/api/auth/login") || uri.equals("/api/auth/refresh")) return loginPerMinute;
        // Notifications du prestataire de paiement : signées et vérifiées, elles ne doivent jamais être rejetées.
        if (uri.startsWith("/api/public/payments/")) return 0;
        if (uri.startsWith("/api/public/")) return publicPerMinute;
        return 0;
    }
}
