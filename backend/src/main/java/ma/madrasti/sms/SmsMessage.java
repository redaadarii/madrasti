package ma.madrasti.sms;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.user.User;

@Entity
@Table(name = "sms_messages")
public class SmsMessage extends BaseEntity {

    public enum Status { SENT, FAILED, SKIPPED }

    private String toPhone;

    @Column(nullable = false)
    private String recipientName;

    @Column(nullable = false)
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    private String error;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sent_by")
    private User sentBy;

    protected SmsMessage() {
    }

    SmsMessage(String toPhone, String recipientName, String body, Status status, String error, User sentBy) {
        this.toPhone = toPhone;
        this.recipientName = recipientName;
        this.body = body;
        this.status = status;
        this.error = error;
        this.sentBy = sentBy;
    }

    public String getToPhone() { return toPhone; }
    public String getRecipientName() { return recipientName; }
    public String getBody() { return body; }
    public Status getStatus() { return status; }
    public String getError() { return error; }
}
