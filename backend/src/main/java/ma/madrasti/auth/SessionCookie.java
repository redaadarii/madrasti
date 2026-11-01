package ma.madrasti.auth;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import ma.madrasti.config.MadrastiProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;

/**
 * Cookie de session portant le JWT : HttpOnly (inaccessible au JavaScript, donc à une injection XSS),
 * SameSite=Strict (jamais envoyé depuis un autre site) et limité aux routes /api.
 */
@Component
public class SessionCookie {

    public static final String NAME = "madrasti_session";

    private final boolean secure;
    private final Duration ttl;

    public SessionCookie(MadrastiProperties properties) {
        this.secure = properties.security().cookieSecure();
        this.ttl = properties.security().tokenTtl();
    }

    public ResponseCookie issue(String token) {
        return build(token, ttl);
    }

    public ResponseCookie clear() {
        return build("", Duration.ZERO);
    }

    public static Optional<String> read(HttpServletRequest request) {
        return Optional.ofNullable(request.getCookies()).stream().flatMap(Arrays::stream)
                .filter(c -> NAME.equals(c.getName())).map(Cookie::getValue).filter(v -> !v.isBlank()).findFirst();
    }

    private ResponseCookie build(String value, Duration maxAge) {
        return ResponseCookie.from(NAME, value).httpOnly(true).secure(secure).sameSite("Strict").path("/api")
                .maxAge(maxAge).build();
    }
}
