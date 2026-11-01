package ma.madrasti.messaging;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.user.User;

import java.time.Instant;

@Entity
@Table(name = "conversation_participants")
public class Participant extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    private Instant lastReadAt;

    protected Participant() {
    }

    public Participant(Conversation conversation, User user) {
        this.conversation = conversation;
        this.user = user;
    }

    public boolean hasUnread() {
        return lastReadAt == null || conversation.getLastMessageAt().isAfter(lastReadAt);
    }

    public void markRead(Instant at) {
        this.lastReadAt = at;
    }

    public Conversation getConversation() { return conversation; }
    public User getUser() { return user; }
}
