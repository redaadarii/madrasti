package ma.madrasti.auth;

import ma.madrasti.audit.AuditAction;
import ma.madrasti.audit.AuditService;
import org.springframework.security.core.AuthenticationException;

import ma.madrasti.common.NotFoundException;
import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.user.User;
import ma.madrasti.user.UserDtos.UserResponse;
import ma.madrasti.user.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthService {

    /** {@code refreshToken} n'est renseigné que pour l'application mobile. */
    public record TokenResponse(String accessToken, Instant expiresAt, UserResponse user, String refreshToken,
                                Instant refreshExpiresAt) {
    }

    private final AuthenticationManager authenticationManager;
    private final JwtEncoder jwtEncoder;
    private final UserRepository users;
    private final MadrastiProperties properties;

    private final AuditService audit;
    private final RefreshTokenService refreshTokens;

    public AuthService(AuthenticationManager authenticationManager, JwtEncoder jwtEncoder, UserRepository users,
                       MadrastiProperties properties, AuditService audit, RefreshTokenService refreshTokens) {
        this.refreshTokens = refreshTokens;
        this.audit = audit;
        this.authenticationManager = authenticationManager;
        this.jwtEncoder = jwtEncoder;
        this.users = users;
        this.properties = properties;
    }

    @Transactional
    public TokenResponse login(String email, String password, boolean mobile) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, password));
        } catch (AuthenticationException e) {
            audit.recordNow(AuditAction.LOGIN_FAILED, email, e.getClass().getSimpleName());
            throw e;
        }
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        audit.recordNow(AuditAction.LOGIN_SUCCESS, user.getEmail(), mobile ? "mobile" : null);
        return mobile ? mobileTokens(refreshTokens.issue(user)) : webToken(user);
    }

    /** Échange un jeton de rafraîchissement contre une nouvelle paire (rotation). */
    @Transactional(readOnly = true)
    public TokenResponse refresh(String refreshToken) {
        // La rotation s'exécute dans sa propre transaction : l'utilisateur est rechargé ici pour la réponse.
        var issued = refreshTokens.rotate(refreshToken);
        var user = users.findById(issued.user().getId()).orElseThrow(RefreshTokenService.InvalidRefreshTokenException::new);
        return mobileTokens(new RefreshTokenService.Issued(issued.value(), user, issued.expiresAt()));
    }

    private TokenResponse webToken(User user) {
        var expiresAt = Instant.now().plus(properties.security().tokenTtl());
        return new TokenResponse(issueToken(user, expiresAt), expiresAt, UserResponse.from(user), null, null);
    }

    private TokenResponse mobileTokens(RefreshTokenService.Issued refresh) {
        var user = refresh.user();
        var expiresAt = Instant.now().plus(properties.security().mobileAccessTtl());
        return new TokenResponse(issueToken(user, expiresAt), expiresAt, UserResponse.from(user), refresh.value(), refresh.expiresAt());
    }

    @Transactional(readOnly = true)
    public UserResponse me(Long userId) {
        return users.findById(userId).map(UserResponse::from)
                .orElseThrow(() -> new NotFoundException("user", userId));
    }

    @Transactional
    public UserResponse changeLanguage(Long userId, String language) {
        var user = users.findById(userId).orElseThrow(() -> new NotFoundException("user", userId));
        user.setLanguage(language);
        return UserResponse.from(user);
    }

    private String issueToken(User user, Instant expiresAt) {
        var claims = JwtClaimsSet.builder()
                .issuer("madrasti")
                .subject(user.getId().toString())
                .issuedAt(Instant.now())
                .expiresAt(expiresAt)
                .claim("email", user.getEmail())
                .claim("role", user.getRole().name())
                .build();
        var header = JwsHeader.with(MacAlgorithm.HS256).build();
        return jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
    }
}
