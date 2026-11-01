package ma.madrasti.competency;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;

/** Compétence du référentiel (ex. « Lire à voix haute un texte court »), rattachée à une matière et à un niveau. */
@Entity
@Table(name = "competencies")
public class Competency extends BaseEntity {

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String label;

    /** Niveau de classe concerné (ex. « CM1 ») ; vide = tous niveaux. */
    private String level;

    protected Competency() {
    }

    public Competency(String subject, String label, String level) {
        this.subject = subject;
        this.label = label;
        this.level = level;
    }

    public boolean appliesTo(String classroomLevel) {
        return level == null || level.equalsIgnoreCase(classroomLevel);
    }

    public String getSubject() { return subject; }
    public String getLabel() { return label; }
    public String getLevel() { return level; }
}
