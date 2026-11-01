package ma.madrasti.notification;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Une seule instance : les connexions sont toutes dans ce processus. */
@Component
@ConditionalOnProperty(name = "madrasti.notifications.relay", havingValue = "local", matchIfMissing = true)
class LocalNotificationRelay implements NotificationRelay {

    private final NotificationHub hub;

    LocalNotificationRelay(NotificationHub hub) {
        this.hub = hub;
    }

    @Override
    public void publish(Long userId, NotificationView notification) {
        hub.push(userId, notification);
    }
}
