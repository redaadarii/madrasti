package ma.madrasti.timetable;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.Classroom;
import ma.madrasti.user.User;

import java.time.LocalTime;

/** Créneau hebdomadaire de l'emploi du temps d'une classe (1 = lundi … 7 = dimanche). */
@Entity
@Table(name = "timetable_slots")
public class TimetableSlot extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY)
    private User teacher;

    @Column(nullable = false)
    private int dayOfWeek;

    @Column(nullable = false)
    private LocalTime startTime;

    @Column(nullable = false)
    private LocalTime endTime;

    @Column(nullable = false)
    private String subject;

    private String room;

    protected TimetableSlot() {
    }

    public TimetableSlot(Classroom classroom, User teacher, int dayOfWeek, LocalTime startTime, LocalTime endTime,
                         String subject, String room) {
        this.classroom = classroom;
        this.teacher = teacher;
        this.dayOfWeek = dayOfWeek;
        this.startTime = startTime;
        this.endTime = endTime;
        this.subject = subject;
        this.room = room;
    }

    public Classroom getClassroom() { return classroom; }
    public User getTeacher() { return teacher; }
    public int getDayOfWeek() { return dayOfWeek; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public String getSubject() { return subject; }
    public String getRoom() { return room; }
}
