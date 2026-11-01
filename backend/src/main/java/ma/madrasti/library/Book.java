package ma.madrasti.library;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import ma.madrasti.common.BaseEntity;

@Entity
@Table(name = "books")
public class Book extends BaseEntity {

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String author;

    private String isbn;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private int copies;

    protected Book() {
    }

    public Book(String title, String author, String isbn, String category, int copies) {
        update(title, author, isbn, category, copies);
    }

    public void update(String title, String author, String isbn, String category, int copies) {
        this.title = title;
        this.author = author;
        this.isbn = isbn;
        this.category = category;
        this.copies = copies;
    }

    public String getTitle() { return title; }
    public String getAuthor() { return author; }
    public String getIsbn() { return isbn; }
    public String getCategory() { return category; }
    public int getCopies() { return copies; }
}
