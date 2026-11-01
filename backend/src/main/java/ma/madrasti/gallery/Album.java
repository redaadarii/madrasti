package ma.madrasti.gallery;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.Classroom;
import ma.madrasti.user.User;

import java.util.ArrayList;
import java.util.List;

/** Album photo, pour toute l'école ({@code classroom} nul) ou pour une classe. */
@Entity
@Table(name = "albums")
public class Album extends BaseEntity {

    @Column(nullable = false)
    private String title;

    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User author;

    @OneToMany(mappedBy = "album", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt")
    private List<Photo> photos = new ArrayList<>();

    protected Album() {
    }

    public Album(String title, String description, Classroom classroom, User author) {
        this.title = title;
        this.description = description;
        this.classroom = classroom;
        this.author = author;
    }

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Classroom getClassroom() { return classroom; }
    public User getAuthor() { return author; }
    public List<Photo> getPhotos() { return photos; }
}
