package ma.madrasti.attendance;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.storage.StoredFile;
import ma.madrasti.student.Student;

import java.time.LocalDate;

@Entity
@Table(name = "absences")
public class Absence extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    @Column(name = "absence_date", nullable = false)
    private LocalDate day;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AbsenceKind kind;

    @Column(nullable = false)
    private boolean justified;

    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JustificationStatus justificationStatus = JustificationStatus.NONE;

    /** Motif et pièce jointe (certificat médical…) déposés par la famille. */
    private String justificationNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "justification_file_id")
    private StoredFile justificationFile;

    protected Absence() {
    }

    public Absence(Student student, LocalDate day, AbsenceKind kind, String reason) {
        this.student = student;
        this.day = day;
        this.kind = kind;
        this.reason = reason;
    }

    public Student getStudent() { return student; }
    public LocalDate getDay() { return day; }
    public AbsenceKind getKind() { return kind; }
    public boolean isJustified() { return justified; }
    public String getReason() { return reason; }
    public JustificationStatus getJustificationStatus() { return justificationStatus; }
    public String getJustificationNote() { return justificationNote; }
    public StoredFile getJustificationFile() { return justificationFile; }

    /** Justification saisie directement par l'école. */
    public void justify(String reason) {
        this.justified = true;
        this.reason = reason;
        this.justificationStatus = JustificationStatus.ACCEPTED;
    }

    /** Justificatif envoyé par la famille, en attente de validation. */
    public void submitJustification(String note, StoredFile file) {
        if (justified) {
            throw new ma.madrasti.common.ConflictException("error.justification.done");
        }
        this.justificationNote = note;
        if (file != null) {
            this.justificationFile = file;
        }
        this.justificationStatus = JustificationStatus.PENDING;
    }

    public void reviewJustification(boolean accepted) {
        if (justificationStatus != JustificationStatus.PENDING) {
            throw new ma.madrasti.common.ConflictException("error.justification.notPending");
        }
        this.justificationStatus = accepted ? JustificationStatus.ACCEPTED : JustificationStatus.REJECTED;
        if (accepted) {
            this.justified = true;
            this.reason = justificationNote;
        }
    }

    public enum JustificationStatus { NONE, PENDING, ACCEPTED, REJECTED }
}
