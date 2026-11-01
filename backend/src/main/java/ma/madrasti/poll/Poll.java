package ma.madrasti.poll;

import jakarta.persistence.*;
import ma.madrasti.announcement.Audience;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.user.User;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** Sondage adressé à une audience (familles, enseignants…) : une réponse par personne. */
@Entity
@Table(name = "polls")
public class Poll extends BaseEntity {

    @Column(nullable = false)
    private String question;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Audience audience;

    /** Dernier jour pour répondre (inclus) ; sans date, le sondage reste ouvert. */
    private LocalDate closesOn;

    @ManyToOne(fetch = FetchType.LAZY)
    private User author;

    @OneToMany(mappedBy = "poll", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<PollOption> options = new ArrayList<>();

    protected Poll() {
    }

    public Poll(String question, Audience audience, LocalDate closesOn, User author, List<String> labels) {
        this.question = question;
        this.audience = audience;
        this.closesOn = closesOn;
        this.author = author;
        for (var i = 0; i < labels.size(); i++) {
            options.add(new PollOption(this, labels.get(i), i));
        }
    }

    public boolean isOpen(LocalDate today) {
        return closesOn == null || !today.isAfter(closesOn);
    }

    public void close(LocalDate today) {
        this.closesOn = today.minusDays(1);
    }

    public String getQuestion() { return question; }
    public Audience getAudience() { return audience; }
    public LocalDate getClosesOn() { return closesOn; }
    public User getAuthor() { return author; }
    public List<PollOption> getOptions() { return options; }
}
