package ma.madrasti.grade;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;

import java.math.BigDecimal;

@Entity
@Table(name = "grades")
public class Grade extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private BigDecimal score;

    @Column(nullable = false)
    private BigDecimal maxScore;

    @Column(nullable = false)
    private String term;

    protected Grade() {
    }

    public Grade(Student student, String subject, String title, BigDecimal score, BigDecimal maxScore, String term) {
        this.student = student;
        this.subject = subject;
        this.title = title;
        this.score = score;
        this.maxScore = maxScore;
        this.term = term;
    }

    public Student getStudent() { return student; }
    public String getSubject() { return subject; }
    public String getTitle() { return title; }
    public BigDecimal getScore() { return score; }
    public BigDecimal getMaxScore() { return maxScore; }
    public String getTerm() { return term; }
}
