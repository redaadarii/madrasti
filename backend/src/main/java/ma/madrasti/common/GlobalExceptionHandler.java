package ma.madrasti.common;

import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Traduit les erreurs métier en réponses RFC 9457 (application/problem+json), dans la langue
 * demandée par le client (en-tête Accept-Language : fr, en ou ar ; français par défaut).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private final MessageSource messages;

    public GlobalExceptionHandler(MessageSource messages) {
        this.messages = messages;
    }

    @ExceptionHandler(NotFoundException.class)
    ProblemDetail notFound(NotFoundException ex) {
        var resource = message("resource." + ex.getResource());
        return problem(HttpStatus.NOT_FOUND, message("error.notFound", resource, ex.getId()));
    }

    @ExceptionHandler(ConflictException.class)
    ProblemDetail conflict(ConflictException ex) {
        return problem(HttpStatus.CONFLICT, message(ex.getCode(), ex.getArgs()));
    }

    @ExceptionHandler({BadCredentialsException.class, DisabledException.class})
    ProblemDetail badCredentials() {
        return problem(HttpStatus.UNAUTHORIZED, message("error.badCredentials"));
    }

    @ExceptionHandler(ma.madrasti.auth.RefreshTokenService.InvalidRefreshTokenException.class)
    ProblemDetail sessionExpired() {
        return problem(HttpStatus.UNAUTHORIZED, message("error.session.expired"));
    }

    @ExceptionHandler(AccessDeniedException.class)
    ProblemDetail forbidden() {
        return problem(HttpStatus.FORBIDDEN, message("error.forbidden"));
    }

    @ExceptionHandler(ma.madrasti.translation.Translator.RefusedException.class)
    ProblemDetail translationRefused() {
        return problem(HttpStatus.UNPROCESSABLE_CONTENT, message("error.translation.refused"));
    }

    @ExceptionHandler(ma.madrasti.translation.Translator.UnavailableException.class)
    ProblemDetail translationUnavailable() {
        return problem(HttpStatus.SERVICE_UNAVAILABLE, message("error.translation.unavailable"));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail invalid(MethodArgumentNotValidException ex) {
        var problem = problem(HttpStatus.BAD_REQUEST, message("error.validation"));
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(error -> errors.putIfAbsent(error.getField(), error.getDefaultMessage()));
        // Contraintes de classe (@AssertTrue sur un getter isXxx) : rattachées au champ « xxx ».
        ex.getBindingResult().getGlobalErrors()
                .forEach(error -> errors.putIfAbsent(error.getObjectName(), error.getDefaultMessage()));
        problem.setProperty("errors", errors);
        return problem;
    }

    private String message(String code, Object... args) {
        return messages.getMessage(code, args, code, LocaleContextHolder.getLocale());
    }

    private static ProblemDetail problem(HttpStatus status, String detail) {
        return ProblemDetail.forStatusAndDetail(status, detail);
    }
}
