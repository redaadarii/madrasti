package ma.madrasti.poll;

import jakarta.persistence.*;

@Entity
@Table(name = "poll_options")
public class PollOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Poll poll;

    @Column(nullable = false)
    private String label;

    @Column(nullable = false)
    private int position;

    protected PollOption() {
    }

    PollOption(Poll poll, String label, int position) {
        this.poll = poll;
        this.label = label;
        this.position = position;
    }

    public Long getId() { return id; }
    public Poll getPoll() { return poll; }
    public String getLabel() { return label; }
    public int getPosition() { return position; }
}
