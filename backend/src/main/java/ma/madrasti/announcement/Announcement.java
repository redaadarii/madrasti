package ma.madrasti.announcement;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.user.User;

@Entity
@Table(name = "announcements")
public class Announcement extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Audience audience;

    @Column(nullable = false)
    private boolean pinned;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User author;

    protected Announcement() {
    }

    public Announcement(String title, String content, Audience audience, boolean pinned, User author) {
        this.title = title;
        this.content = content;
        this.audience = audience;
        this.pinned = pinned;
        this.author = author;
    }

    public String getTitle() { return title; }
    public String getContent() { return content; }
    public Audience getAudience() { return audience; }
    public boolean isPinned() { return pinned; }
    public User getAuthor() { return author; }
}
