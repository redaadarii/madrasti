package ma.madrasti.notification;

import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Clock;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@Transactional
public class NotificationController {

    private final NotificationRepository notifications;
    private final NotificationHub hub;
    private final Clock clock;

    public NotificationController(NotificationRepository notifications, NotificationHub hub, Clock clock) {
        this.notifications = notifications;
        this.hub = hub;
        this.clock = clock;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<NotificationView> latest(@RequestParam(defaultValue = "30") int limit) {
        return notifications.findByUserIdOrderByCreatedAtDesc(CurrentUser.get().id(), PageRequest.of(0, Math.clamp(limit, 1, 100)))
                .stream().map(NotificationView::from).toList();
    }

    @GetMapping("/unread-count")
    @Transactional(readOnly = true)
    public Map<String, Long> unreadCount() {
        return Map.of("count", notifications.countByUserIdAndReadAtIsNull(CurrentUser.get().id()));
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void read(@PathVariable Long id) {
        notifications.findByIdAndUserId(id, CurrentUser.get().id())
                .orElseThrow(() -> new NotFoundException("notification", id))
                .markRead(clock.instant());
    }

    @PostMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void readAll() {
        notifications.markAllRead(CurrentUser.get().id(), clock.instant());
    }

    /** Flux temps réel (text/event-stream) ; le client se reconnecte automatiquement en cas de coupure. */
    @GetMapping(path = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    public SseEmitter stream() {
        return hub.subscribe(CurrentUser.get().id());
    }
}
