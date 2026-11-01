package ma.madrasti.complaint;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;
import ma.madrasti.user.User;

@Entity
@Table(name = "complaints")
public class Complaint extends BaseEntity {

    public enum Category { PEDAGOGY, ADMINISTRATION, FINANCE, TRANSPORT, CANTEEN, OTHER }

    public enum Status { OPEN, IN_PROGRESS, RESOLVED }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User author;

    @ManyToOne(fetch = FetchType.LAZY)
    private Student student;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.OPEN;

    @Column(columnDefinition = "TEXT")
    private String response;

    protected Complaint() {
    }

    public Complaint(User author, Student student, Category category, String subject, String body) {
        this.author = author;
        this.student = student;
        this.category = category;
        this.subject = subject;
        this.body = body;
    }

    public void handle(Status status, String response) {
        this.status = status;
        this.response = response;
    }

    public User getAuthor() { return author; }
    public Student getStudent() { return student; }
    public Category getCategory() { return category; }
    public String getSubject() { return subject; }
    public String getBody() { return body; }
    public Status getStatus() { return status; }
    public String getResponse() { return response; }
}
