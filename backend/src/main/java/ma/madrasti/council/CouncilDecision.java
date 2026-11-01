package ma.madrasti.council;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;

/** Décision du conseil de classe pour un élève et un trimestre, reprise sur le bulletin. */
@Entity
@Table(name = "council_decisions")
public class CouncilDecision extends BaseEntity {

    public enum Decision { CONGRATULATIONS, COMPLIMENTS, ENCOURAGEMENTS, NONE, WARNING }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    @Column(nullable = false)
    private String term;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Decision decision;

    private String appreciation;

    protected CouncilDecision() {
    }

    public CouncilDecision(Student student, String term) {
        this.student = student;
        this.term = term;
    }

    public void record(Decision decision, String appreciation) {
        this.decision = decision;
        this.appreciation = appreciation;
    }

    /** Proposition automatique à partir de la moyenne générale, que le conseil peut modifier. */
    public static Decision suggest(double average) {
        if (average >= 16) return Decision.CONGRATULATIONS;
        if (average >= 14) return Decision.COMPLIMENTS;
        if (average >= 12) return Decision.ENCOURAGEMENTS;
        if (average < 8) return Decision.WARNING;
        return Decision.NONE;
    }

    public Student getStudent() { return student; }
    public String getTerm() { return term; }
    public Decision getDecision() { return decision; }
    public String getAppreciation() { return appreciation; }
}
