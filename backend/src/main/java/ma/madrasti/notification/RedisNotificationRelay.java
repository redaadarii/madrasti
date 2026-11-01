package ma.madrasti.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Plusieurs instances : chaque notification est annoncée sur un canal Redis (« idUtilisateur:idNotification »).
 * Toutes les instances la reçoivent, la relisent en base et la poussent à leurs propres connexions SSE.
 */
@Configuration
@ConditionalOnProperty(name = "madrasti.notifications.relay", havingValue = "redis")
class RedisNotificationRelay {

    static final String CHANNEL = "madrasti:notifications";
    private static final Logger log = LoggerFactory.getLogger(RedisNotificationRelay.class);

    record Envelope(long userId, long notificationId) {
        String encode() {
            return userId + ":" + notificationId;
        }

        static Envelope decode(String payload) {
            var parts = payload.split(":", 2);
            return new Envelope(Long.parseLong(parts[0]), Long.parseLong(parts[1]));
        }
    }

    @Bean
    NotificationRelay redisRelay(StringRedisTemplate redis) {
        return (userId, notification) -> redis.convertAndSend(CHANNEL, new Envelope(userId, notification.id()).encode());
    }

    @Bean
    RedisMessageListenerContainer notificationListener(RedisConnectionFactory connections, NotificationRepository notifications,
                                                       NotificationHub hub, TransactionTemplate transactions) {
        var container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connections);
        container.addMessageListener((message, pattern) -> {
            try {
                var envelope = Envelope.decode(new String(message.getBody(), java.nio.charset.StandardCharsets.UTF_8));
                transactions.executeWithoutResult(status -> notifications.findById(envelope.notificationId())
                        .map(NotificationView::from)
                        .ifPresent(view -> hub.push(envelope.userId(), view)));
            } catch (RuntimeException e) {
                log.warn("Notification Redis ignorée : {}", e.getMessage());
            }
        }, new ChannelTopic(CHANNEL));
        return container;
    }
}
