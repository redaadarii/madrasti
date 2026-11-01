package ma.madrasti.calendar;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.Classroom;
import ma.madrasti.user.User;

import java.time.Instant;

/** Entrée de l'agenda : pour toute l'école ({@code classroom} nul) ou pour une classe (ex. un contrôle). */
@Entity
@Table(name = "events")
public class SchoolEvent extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventKind kind;

    @Column(nullable = false)
    private Instant startsAt;

    private Instant endsAt;

    @ManyToOne(fetch = FetchType.LAZY)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User author;

    protected SchoolEvent() {
    }

    public SchoolEvent(String title, String description, EventKind kind, Instant startsAt, Instant endsAt,
                       Classroom classroom, User author) {
        this.title = title;
        this.description = description;
        this.kind = kind;
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.classroom = classroom;
        this.author = author;
    }

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public EventKind getKind() { return kind; }
    public Instant getStartsAt() { return startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public Classroom getClassroom() { return classroom; }
    public User getAuthor() { return author; }
}
