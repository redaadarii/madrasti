package ma.madrasti.auth;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import ma.madrasti.auth.AuthService.TokenResponse;
import ma.madrasti.user.UserDtos.UserResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    /** {@code client} : « mobile » pour recevoir un jeton de rafraîchissement au lieu du cookie de session. */
    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password, String client) {
        boolean mobile() {
            return "mobile".equals(client);
        }
    }

    public record RefreshRequest(@NotBlank String refreshToken) {
    }

    public record LogoutRequest(String refreshToken) {
    }

    public record LanguageRequest(@NotBlank @jakarta.validation.constraints.Pattern(regexp = "fr|en|ar") String language) {
    }

    private final AuthService authService;
    private final SessionCookie sessionCookie;
    private final RefreshTokenService refreshTokens;

    public AuthController(AuthService authService, SessionCookie sessionCookie, RefreshTokenService refreshTokens) {
        this.authService = authService;
        this.sessionCookie = sessionCookie;
        this.refreshTokens = refreshTokens;
    }

    /**
     * Le navigateur reçoit le jeton dans un cookie HttpOnly ; il reste aussi dans la réponse
     * pour les clients API (scripts, Swagger). L'application mobile reçoit en plus un jeton de rafraîchissement.
     */
    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        var token = authService.login(request.email(), request.password(), request.mobile());
        if (!request.mobile()) {
            response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.issue(token.accessToken()).toString());
        }
        return token;
    }

    /** Application mobile : nouveau jeton d'accès sans ressaisir le mot de passe (le jeton présenté est consommé). */
    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(@RequestBody(required = false) LogoutRequest request, HttpServletResponse response) {
        if (request != null && request.refreshToken() != null) {
            refreshTokens.revoke(request.refreshToken());
        }
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie.clear().toString());
    }

    @GetMapping("/me")
    public UserResponse me() {
        return authService.me(CurrentUser.get().id());
    }

    /** Mémorise la langue choisie dans l'interface : elle sert aux notifications et aux SMS. */
    @PutMapping("/me/language")
    public UserResponse language(@Valid @RequestBody LanguageRequest request) {
        return authService.changeLanguage(CurrentUser.get().id(), request.language());
    }
}
