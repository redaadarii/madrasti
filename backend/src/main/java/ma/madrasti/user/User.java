package ma.madrasti.user;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.School;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    private School school;

    @Column(nullable = false)
    private boolean active = true;

    /** Langue des notifications et SMS (fr, en, ar). */
    @Column(nullable = false, length = 2)
    private String language = "fr";

    protected User() {
    }

    public User(String email, String passwordHash, String firstName, String lastName, Role role) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.firstName = firstName;
        this.lastName = lastName;
        this.role = role;
    }

    public String fullName() { return firstName + " " + lastName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getLanguage() { return language; }
    public void setLanguage(String language) { this.language = language; }
}
