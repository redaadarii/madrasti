package ma.madrasti.notification;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.user.User;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Notification in-app. Seuls le type et les paramètres sont stockés : le texte est composé
 * côté client, dans la langue de l'utilisateur au moment de l'affichage.
 */
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationType type;

    private String link;

    private Instant readAt;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "notification_params", joinColumns = @JoinColumn(name = "notification_id"))
    @MapKeyColumn(name = "param_name")
    @Column(name = "param_value", nullable = false)
    private Map<String, String> params = new HashMap<>();

    protected Notification() {
    }

    public Notification(User user, NotificationType type, String link, Map<String, String> params) {
        this.user = user;
        this.type = type;
        this.link = link;
        this.params = new HashMap<>(params);
    }

    public void markRead(Instant at) {
        if (readAt == null) {
            readAt = at;
        }
    }

    public User getUser() { return user; }
    public NotificationType getType() { return type; }
    public String getLink() { return link; }
    public Instant getReadAt() { return readAt; }
    public Map<String, String> getParams() { return params; }
}
