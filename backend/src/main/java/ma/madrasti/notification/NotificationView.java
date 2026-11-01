package ma.madrasti.notification;

import java.time.Instant;
import java.util.Map;

public record NotificationView(Long id, NotificationType type, Map<String, String> params, String link, boolean read,
                               Instant createdAt) {

    static NotificationView from(Notification n) {
        return new NotificationView(n.getId(), n.getType(), Map.copyOf(n.getParams()), n.getLink(), n.getReadAt() != null,
                n.getCreatedAt());
    }
}
