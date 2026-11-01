package ma.madrasti.poll;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.user.User;

@Entity
@Table(name = "poll_votes")
public class PollVote extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Poll poll;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private PollOption option;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User user;

    protected PollVote() {
    }

    public PollVote(Poll poll, PollOption option, User user) {
        this.poll = poll;
        this.option = option;
        this.user = user;
    }

    public Poll getPoll() { return poll; }
    public PollOption getOption() { return option; }
    public User getUser() { return user; }
}
