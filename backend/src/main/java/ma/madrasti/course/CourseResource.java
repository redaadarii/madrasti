package ma.madrasti.course;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.Classroom;
import ma.madrasti.storage.StoredFile;
import ma.madrasti.user.User;

/** Support de cours en ligne : fichier déposé, lien vers une vidéo ou une page. */
@Entity
@Table(name = "course_resources")
public class CourseResource extends BaseEntity {

    public enum Kind { FILE, VIDEO, LINK }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User teacher;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String title;

    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;

    private String url;

    @ManyToOne(fetch = FetchType.LAZY)
    private StoredFile file;

    protected CourseResource() {
    }

    public CourseResource(Classroom classroom, User teacher, String subject, String title, String description, Kind kind,
                          String url, StoredFile file) {
        this.classroom = classroom;
        this.teacher = teacher;
        this.subject = subject;
        this.title = title;
        this.description = description;
        this.kind = kind;
        this.url = url;
        this.file = file;
    }

    public Classroom getClassroom() { return classroom; }
    public User getTeacher() { return teacher; }
    public String getSubject() { return subject; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Kind getKind() { return kind; }
    public String getUrl() { return url; }
    public StoredFile getFile() { return file; }
}
