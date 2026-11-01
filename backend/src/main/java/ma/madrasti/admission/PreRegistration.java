package ma.madrasti.admission;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;

import java.time.LocalDate;

/** Demande de pré-inscription déposée en ligne par une famille, avant tout compte. */
@Entity
@Table(name = "pre_registrations")
public class PreRegistration extends BaseEntity {

    public enum Status { PENDING, ACCEPTED, REJECTED }

    @Column(nullable = false)
    private String childFirstName;

    @Column(nullable = false)
    private String childLastName;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Column(nullable = false)
    private String desiredLevel;

    @Column(nullable = false)
    private String parentName;

    @Column(nullable = false)
    private String parentEmail;

    @Column(nullable = false)
    private String parentPhone;

    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    protected PreRegistration() {
    }

    public PreRegistration(String childFirstName, String childLastName, LocalDate birthDate, String desiredLevel,
                           String parentName, String parentEmail, String parentPhone, String message) {
        this.childFirstName = childFirstName;
        this.childLastName = childLastName;
        this.birthDate = birthDate;
        this.desiredLevel = desiredLevel;
        this.parentName = parentName;
        this.parentEmail = parentEmail;
        this.parentPhone = parentPhone;
        this.message = message;
    }

    public void decide(Status status) {
        this.status = status;
    }

    public String getChildFirstName() { return childFirstName; }
    public String getChildLastName() { return childLastName; }
    public LocalDate getBirthDate() { return birthDate; }
    public String getDesiredLevel() { return desiredLevel; }
    public String getParentName() { return parentName; }
    public String getParentEmail() { return parentEmail; }
    public String getParentPhone() { return parentPhone; }
    public String getMessage() { return message; }
    public Status getStatus() { return status; }
}
