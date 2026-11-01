package ma.madrasti.appointment;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;
import ma.madrasti.user.User;

import java.time.LocalDateTime;

/** Créneau de rendez-vous publié par un enseignant (ou la direction), réservable par un parent. */
@Entity
@Table(name = "appointment_slots")
public class AppointmentSlot extends BaseEntity {

    public enum Mode { IN_PERSON, VISIO, PHONE }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User teacher;

    @Column(nullable = false)
    private LocalDateTime startsAt;

    @Column(nullable = false)
    private int durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Mode mode;

    private String location;

    @ManyToOne(fetch = FetchType.LAZY)
    private User parent;

    @ManyToOne(fetch = FetchType.LAZY)
    private Student student;

    private String topic;

    protected AppointmentSlot() {
    }

    public AppointmentSlot(User teacher, LocalDateTime startsAt, int durationMinutes, Mode mode, String location) {
        this.teacher = teacher;
        this.startsAt = startsAt;
        this.durationMinutes = durationMinutes;
        this.mode = mode;
        this.location = location;
    }

    public boolean isBooked() { return parent != null; }

    public void cancelBooking() {
        this.parent = null;
        this.student = null;
        this.topic = null;
    }

    public User getTeacher() { return teacher; }
    public LocalDateTime getStartsAt() { return startsAt; }
    public int getDurationMinutes() { return durationMinutes; }
    public LocalDateTime getEndsAt() { return startsAt.plusMinutes(durationMinutes); }
    public Mode getMode() { return mode; }
    public String getLocation() { return location; }
    public User getParent() { return parent; }
    public Student getStudent() { return student; }
    public String getTopic() { return topic; }

}
