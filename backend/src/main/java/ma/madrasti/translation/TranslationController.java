package ma.madrasti.translation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.config.MadrastiProperties;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Traduction à la demande des contenus saisis. Les résultats sont mis en cache (une annonce lue par
 * toute l'école n'est traduite qu'une fois par langue) et chaque utilisateur est limité par minute.
 */
@RestController
@RequestMapping("/api/translate")
public class TranslationController {

    public record TranslateRequest(@NotBlank @Size(max = 5000) String text, @NotNull Translator.Language target) {
    }

    public record TranslateResponse(String translation) {
    }

    private static final int CACHE_SIZE = 2_000;

    private final ObjectProvider<Translator> translator;
    private final int perUserPerMinute;
    private final Clock clock;
    private final Map<String, String> cache = Collections.synchronizedMap(new LinkedHashMap<>(256, 0.75f, true) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, String> eldest) {
            return size() > CACHE_SIZE;
        }
    });
    private final Map<Long, long[]> usage = new ConcurrentHashMap<>();

    public TranslationController(ObjectProvider<Translator> translator, MadrastiProperties properties, Clock clock) {
        this.translator = translator;
        this.perUserPerMinute = properties.translation().perUserPerMinute();
        this.clock = clock;
    }

    @GetMapping("/status")
    public Map<String, Boolean> status() {
        return Map.of("enabled", translator.getIfAvailable() != null);
    }

    @PostMapping
    public TranslateResponse translate(@Valid @RequestBody TranslateRequest request) {
        var service = translator.getIfAvailable();
        if (service == null) {
            throw new Translator.UnavailableException("translation disabled", null);
        }
        var key = request.target() + ":" + request.text().strip();
        var cached = cache.get(key);
        if (cached != null) {
            return new TranslateResponse(cached);
        }
        consumeQuota(CurrentUser.get().id());
        var translation = service.translate(request.text().strip(), request.target());
        cache.put(key, translation);
        return new TranslateResponse(translation);
    }

    /** Fenêtre fixe d'une minute par utilisateur : [minute, nombre d'appels]. */
    private void consumeQuota(Long userId) {
        var minute = clock.millis() / 60_000;
        var count = new AtomicInteger();
        usage.compute(userId, (id, window) -> {
            var current = window == null || window[0] != minute ? new long[]{minute, 0} : window;
            current[1]++;
            count.set((int) current[1]);
            return current;
        });
        if (count.get() > perUserPerMinute) {
            throw new ConflictException("error.tooManyRequests");
        }
    }
}
