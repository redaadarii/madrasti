package ma.madrasti.messaging;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import ma.madrasti.common.BaseEntity;

import java.time.Instant;

@Entity
@Table(name = "conversations")
public class Conversation extends BaseEntity {

    private static final int PREVIEW_LENGTH = 200;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private Instant lastMessageAt;

    @Column(nullable = false)
    private String lastMessagePreview;

    protected Conversation() {
    }

    public Conversation(String subject) {
        this.subject = subject;
    }

    /** Dénormalise le dernier message pour lister les conversations sans charger leurs messages. */
    public void touch(String body, Instant at) {
        this.lastMessageAt = at;
        this.lastMessagePreview = body.length() <= PREVIEW_LENGTH ? body : body.substring(0, PREVIEW_LENGTH - 1) + "…";
    }

    public String getSubject() { return subject; }
    public Instant getLastMessageAt() { return lastMessageAt; }
    public String getLastMessagePreview() { return lastMessagePreview; }
}
