package ma.madrasti.notification;

/** Achemine une notification vers les connexions SSE de son destinataire, où qu'elles soient ouvertes. */
public interface NotificationRelay {

    void publish(Long userId, NotificationView notification);
}
