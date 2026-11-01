package ma.madrasti.services;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;

@Entity
@Table(name = "service_subscriptions")
public class Subscription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private CampusService service;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    protected Subscription() {
    }

    public Subscription(CampusService service, Student student) {
        this.service = service;
        this.student = student;
    }

    public CampusService getService() { return service; }
    public Student getStudent() { return student; }
}
