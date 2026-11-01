package ma.madrasti.messaging;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.user.User;

@Entity
@Table(name = "messages")
public class Message extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Conversation conversation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    protected Message() {
    }

    public Message(Conversation conversation, User sender, String body) {
        this.conversation = conversation;
        this.sender = sender;
        this.body = body;
    }

    public Conversation getConversation() { return conversation; }
    public User getSender() { return sender; }
    public String getBody() { return body; }
}
