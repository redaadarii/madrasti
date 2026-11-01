package ma.madrasti.services;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;

import java.math.BigDecimal;

/** Service périscolaire facturé au mois : transport, cantine/garde ou activité extra-scolaire. */
@Entity
@Table(name = "school_services")
public class CampusService extends BaseEntity {

    public enum Kind { TRANSPORT, CANTEEN, ACTIVITY }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Kind kind;

    @Column(nullable = false)
    private String name;

    private String description;
    private String schedule;

    @Column(nullable = false)
    private BigDecimal monthlyFee;

    /** {@code null} : places illimitées. */
    private Integer capacity;

    @Column(nullable = false)
    private boolean active = true;

    protected CampusService() {
    }

    public CampusService(Kind kind, String name, String description, String schedule, BigDecimal monthlyFee,
                         Integer capacity) {
        update(kind, name, description, schedule, monthlyFee, capacity);
    }

    public void update(Kind kind, String name, String description, String schedule, BigDecimal monthlyFee,
                       Integer capacity) {
        this.kind = kind;
        this.name = name;
        this.description = description;
        this.schedule = schedule;
        this.monthlyFee = monthlyFee;
        this.capacity = capacity;
    }

    public void setActive(boolean active) { this.active = active; }

    public Kind getKind() { return kind; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getSchedule() { return schedule; }
    public BigDecimal getMonthlyFee() { return monthlyFee; }
    public Integer getCapacity() { return capacity; }
    public boolean isActive() { return active; }
}
