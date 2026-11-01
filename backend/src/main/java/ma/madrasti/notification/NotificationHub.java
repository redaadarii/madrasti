package ma.madrasti.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Connexions Server-Sent Events ouvertes, par utilisateur (plusieurs onglets possibles).
 * En mémoire : suffisant pour une instance ; au-delà, relayer via un broker (Redis, Kafka…).
 */
@Component
public class NotificationHub {

    private static final Logger log = LoggerFactory.getLogger(NotificationHub.class);

    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();
    /** Durée de vie d'une connexion ; le navigateur se reconnecte seul à son expiration. */
    private final Duration timeout;

    public NotificationHub(@Value("${madrasti.notifications.stream-timeout:30m}") Duration timeout) {
        this.timeout = timeout;
    }

    public SseEmitter subscribe(Long userId) {
        var emitter = new SseEmitter(timeout.toMillis());
        var list = emitters.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>());
        list.add(emitter);
        Runnable remove = () -> list.remove(emitter);
        emitter.onCompletion(remove);
        // Expiration normale : on clôt nous-mêmes le flux (EventSource se reconnecte), sans exception côté serveur.
        emitter.onTimeout(() -> {
            remove.run();
            emitter.complete();
        });
        emitter.onError(e -> remove.run());
        send(emitter, SseEmitter.event().name("ready").data("ok"));
        return emitter;
    }

    public void push(Long userId, NotificationView notification) {
        for (var emitter : emitters.getOrDefault(userId, List.of())) {
            send(emitter, SseEmitter.event().name("notification").data(notification, MediaType.APPLICATION_JSON));
        }
    }

    /** Empêche proxys et navigateurs de fermer une connexion restée silencieuse. */
    @Scheduled(fixedRate = 25_000)
    void heartbeat() {
        emitters.values().forEach(list -> list.forEach(emitter -> send(emitter, SseEmitter.event().comment("ping"))));
    }

    int connections() {
        return emitters.values().stream().mapToInt(List::size).sum();
    }

    private static void send(SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException | IllegalStateException e) {
            log.debug("Connexion SSE fermée : {}", e.getMessage());
            emitter.completeWithError(e);
        }
    }
}
