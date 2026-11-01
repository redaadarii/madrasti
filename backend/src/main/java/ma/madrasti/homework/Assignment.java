package ma.madrasti.homework;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.Classroom;
import ma.madrasti.user.User;

import java.time.LocalDate;

/** Devoir publié dans le cahier de textes d'une classe. */
@Entity
@Table(name = "assignments")
public class Assignment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User teacher;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private LocalDate dueDate;

    protected Assignment() {
    }

    public Assignment(Classroom classroom, User teacher, String subject, String title, String description,
                      LocalDate dueDate) {
        this.classroom = classroom;
        this.teacher = teacher;
        this.subject = subject;
        this.title = title;
        this.description = description;
        this.dueDate = dueDate;
    }

    public Classroom getClassroom() { return classroom; }
    public User getTeacher() { return teacher; }
    public String getSubject() { return subject; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public LocalDate getDueDate() { return dueDate; }
}
