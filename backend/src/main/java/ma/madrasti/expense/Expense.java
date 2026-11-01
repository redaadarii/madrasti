package ma.madrasti.expense;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Décaissement suivi de la commande (bon de commande) jusqu'au paiement de la facture. */
@Entity
@Table(name = "expenses")
public class Expense extends BaseEntity {

    public enum Category { SALARIES, SUPPLIES, MAINTENANCE, TRANSPORT, CANTEEN, UTILITIES, OTHER }

    public enum Status { ORDERED, INVOICED, PAID }

    @Column(nullable = false)
    private String label;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;

    private String supplier;

    /** Numéro de bon de commande ou de facture. */
    private String reference;

    @Column(nullable = false)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.ORDERED;

    @Column(nullable = false)
    private LocalDate orderedOn;

    private LocalDate paidOn;

    protected Expense() {
    }

    public Expense(String label, Category category, String supplier, String reference, BigDecimal amount, LocalDate orderedOn) {
        update(label, category, supplier, reference, amount, orderedOn);
    }

    public void update(String label, Category category, String supplier, String reference, BigDecimal amount,
                       LocalDate orderedOn) {
        this.label = label;
        this.category = category;
        this.supplier = supplier;
        this.reference = reference;
        this.amount = amount;
        this.orderedOn = orderedOn;
    }

    /** Le passage à PAID date le décaissement ; revenir en arrière l'annule. */
    public void moveTo(Status status, LocalDate today) {
        this.status = status;
        this.paidOn = status == Status.PAID ? (paidOn == null ? today : paidOn) : null;
    }

    public String getLabel() { return label; }
    public Category getCategory() { return category; }
    public String getSupplier() { return supplier; }
    public String getReference() { return reference; }
    public BigDecimal getAmount() { return amount; }
    public Status getStatus() { return status; }
    public LocalDate getOrderedOn() { return orderedOn; }
    public LocalDate getPaidOn() { return paidOn; }
}
