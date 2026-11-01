package ma.madrasti.live;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.Classroom;
import ma.madrasti.user.User;

import java.time.Duration;
import java.time.Instant;

/** Cours en visioconférence planifié pour une classe. */
@Entity
@Table(name = "live_sessions")
public class LiveSession extends BaseEntity {

    public enum Status { UPCOMING, LIVE, ENDED }

    /** La salle s'ouvre un peu avant l'heure pour laisser les élèves s'installer. */
    static final Duration EARLY_ACCESS = Duration.ofMinutes(10);

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User teacher;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private Instant startsAt;

    @Column(nullable = false)
    private int durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LiveProvider provider;

    @Column(nullable = false)
    private String meetingUrl;

    protected LiveSession() {
    }

    public LiveSession(Classroom classroom, User teacher, String subject, String title, Instant startsAt,
                       int durationMinutes, LiveProvider provider, String meetingUrl) {
        this.classroom = classroom;
        this.teacher = teacher;
        this.subject = subject;
        this.title = title;
        this.startsAt = startsAt;
        this.durationMinutes = durationMinutes;
        this.provider = provider;
        this.meetingUrl = meetingUrl;
    }

    public Instant endsAt() {
        return startsAt.plus(Duration.ofMinutes(durationMinutes));
    }

    public Status status(Instant now) {
        if (now.isBefore(startsAt.minus(EARLY_ACCESS))) {
            return Status.UPCOMING;
        }
        return now.isBefore(endsAt()) ? Status.LIVE : Status.ENDED;
    }

    public Classroom getClassroom() { return classroom; }
    public User getTeacher() { return teacher; }
    public String getSubject() { return subject; }
    public String getTitle() { return title; }
    public Instant getStartsAt() { return startsAt; }
    public int getDurationMinutes() { return durationMinutes; }
    public LiveProvider getProvider() { return provider; }
    public String getMeetingUrl() { return meetingUrl; }
}
