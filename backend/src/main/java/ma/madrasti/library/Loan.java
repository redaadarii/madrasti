package ma.madrasti.library;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;

import java.time.LocalDate;

@Entity
@Table(name = "loans")
public class Loan extends BaseEntity {

    public enum Status { ACTIVE, OVERDUE, RETURNED }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Book book;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    @Column(nullable = false)
    private LocalDate borrowedOn;

    @Column(nullable = false)
    private LocalDate dueOn;

    private LocalDate returnedOn;

    protected Loan() {
    }

    public Loan(Book book, Student student, LocalDate borrowedOn, LocalDate dueOn) {
        this.book = book;
        this.student = student;
        this.borrowedOn = borrowedOn;
        this.dueOn = dueOn;
    }

    public Status status(LocalDate today) {
        if (returnedOn != null) {
            return Status.RETURNED;
        }
        return dueOn.isBefore(today) ? Status.OVERDUE : Status.ACTIVE;
    }

    public void giveBack(LocalDate on) {
        this.returnedOn = on;
    }

    public Book getBook() { return book; }
    public Student getStudent() { return student; }
    public LocalDate getBorrowedOn() { return borrowedOn; }
    public LocalDate getDueOn() { return dueOn; }
    public LocalDate getReturnedOn() { return returnedOn; }
}
