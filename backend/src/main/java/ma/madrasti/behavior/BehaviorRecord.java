package ma.madrasti.behavior;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;
import ma.madrasti.user.User;

import java.time.LocalDate;

/** Observation de comportement : point positif (participation, entraide…) ou incident, avec sanction éventuelle. */
@Entity
@Table(name = "behavior_records")
public class BehaviorRecord extends BaseEntity {

    public enum Category {
        PARTICIPATION(1), HELPING(1), TEAMWORK(1), EFFORT(1), RESPECT(1),
        DISRUPTION(-1), FORGOTTEN_MATERIAL(-1), HOMEWORK_MISSING(-1), DISRESPECT(-2), CHEATING(-3);

        private final int points;

        Category(int points) {
            this.points = points;
        }

        public int points() { return points; }
        public boolean positive() { return points > 0; }
    }

    public enum Sanction { WARNING, DETENTION, EXCLUSION }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    private User author;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Enumerated(EnumType.STRING)
    private Sanction sanction;

    private String note;

    @Column(nullable = false)
    private LocalDate occurredOn;

    protected BehaviorRecord() {
    }

    public BehaviorRecord(Student student, User author, Category category, Sanction sanction, String note, LocalDate occurredOn) {
        if (category.positive() && sanction != null) {
            throw new IllegalArgumentException("Pas de sanction pour un point positif");
        }
        this.student = student;
        this.author = author;
        this.category = category;
        this.sanction = sanction;
        this.note = note;
        this.occurredOn = occurredOn;
    }

    public Student getStudent() { return student; }
    public User getAuthor() { return author; }
    public Category getCategory() { return category; }
    public Sanction getSanction() { return sanction; }
    public String getNote() { return note; }
    public LocalDate getOccurredOn() { return occurredOn; }
}
