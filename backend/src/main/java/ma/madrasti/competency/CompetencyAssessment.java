package ma.madrasti.competency;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;
import ma.madrasti.user.User;

@Entity
@Table(name = "competency_assessments")
public class CompetencyAssessment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Competency competency;

    @Column(nullable = false)
    private String term;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Mastery mastery;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessed_by")
    private User assessedBy;

    protected CompetencyAssessment() {
    }

    public CompetencyAssessment(Student student, Competency competency, String term) {
        this.student = student;
        this.competency = competency;
        this.term = term;
    }

    public void assess(Mastery mastery, User by) {
        this.mastery = mastery;
        this.assessedBy = by;
    }

    public Student getStudent() { return student; }
    public Competency getCompetency() { return competency; }
    public String getTerm() { return term; }
    public Mastery getMastery() { return mastery; }
}
