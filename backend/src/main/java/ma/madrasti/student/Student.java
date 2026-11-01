package ma.madrasti.student;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.Classroom;
import ma.madrasti.user.User;

import java.time.LocalDate;

@Entity
@Table(name = "students")
public class Student extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String registrationNumber;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private LocalDate birthDate;

    /** Identifiant national de l'élève (MASSAR), utilisé pour les exports ministériels. */
    private String massarCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY)
    private User parent;

    /** Compte de connexion de l'élève (espace élève : devoirs, classes en direct). */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User account;

    protected Student() {
    }

    public Student(String registrationNumber, String firstName, String lastName, Classroom classroom) {
        this.registrationNumber = registrationNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.classroom = classroom;
    }

    public String fullName() { return firstName + " " + lastName; }

    public String getRegistrationNumber() { return registrationNumber; }
    public void setRegistrationNumber(String registrationNumber) { this.registrationNumber = registrationNumber; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public LocalDate getBirthDate() { return birthDate; }
    public void setBirthDate(LocalDate birthDate) { this.birthDate = birthDate; }
    public String getMassarCode() { return massarCode; }
    public void setMassarCode(String massarCode) { this.massarCode = massarCode; }
    public Classroom getClassroom() { return classroom; }
    public void setClassroom(Classroom classroom) { this.classroom = classroom; }
    public User getParent() { return parent; }
    public void setParent(User parent) { this.parent = parent; }
    public User getAccount() { return account; }
    public void setAccount(User account) { this.account = account; }
}
