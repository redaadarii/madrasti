package ma.madrasti.finance;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {

    public enum Status { PAID, PENDING, OVERDUE }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate dueDate;

    private LocalDate paidAt;

    @Enumerated(EnumType.STRING)
    private PaymentMethod method;

    protected Payment() {
    }

    public Payment(Student student, String label, BigDecimal amount, LocalDate dueDate) {
        this.student = student;
        this.label = label;
        this.amount = amount;
        this.dueDate = dueDate;
    }

    /** Statut dérivé : jamais stocké, donc jamais désynchronisé. */
    public Status status(LocalDate today) {
        if (paidAt != null) {
            return Status.PAID;
        }
        return dueDate.isBefore(today) ? Status.OVERDUE : Status.PENDING;
    }

    public void markPaid(LocalDate paidAt, PaymentMethod method) {
        this.paidAt = paidAt;
        this.method = method;
    }

    public Student getStudent() { return student; }
    public String getLabel() { return label; }
    public BigDecimal getAmount() { return amount; }
    public LocalDate getDueDate() { return dueDate; }
    public LocalDate getPaidAt() { return paidAt; }
    public PaymentMethod getMethod() { return method; }
}
