package ma.madrasti.homework;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;

/** Copie rendue par un élève pour un devoir, éventuellement corrigée. */
@Entity
@Table(name = "submissions")
public class Submission extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Assignment assignment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private Instant submittedAt;

    private BigDecimal score;
    private String feedback;

    protected Submission() {
    }

    public Submission(Assignment assignment, Student student) {
        this.assignment = assignment;
        this.student = student;
    }

    public void submit(String content, Instant at) {
        this.content = content;
        this.submittedAt = at;
    }

    public void review(BigDecimal score, String feedback) {
        this.score = score;
        this.feedback = feedback;
    }

    public boolean isReviewed() {
        return score != null;
    }

    /** Rendu après la date limite (fin de journée, fuseau de l'école). */
    public boolean isLate(ZoneId zone) {
        return submittedAt.atZone(zone).toLocalDate().isAfter(assignment.getDueDate());
    }

    public Assignment getAssignment() { return assignment; }
    public Student getStudent() { return student; }
    public String getContent() { return content; }
    public Instant getSubmittedAt() { return submittedAt; }
    public BigDecimal getScore() { return score; }
    public String getFeedback() { return feedback; }
}
