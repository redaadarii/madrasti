package ma.madrasti.poll;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PollVoteRepository extends JpaRepository<PollVote, Long> {

    boolean existsByPollIdAndUserId(Long pollId, Long userId);

    /** Lignes (sondage, option, nombre de voix). */
    @Query("select v.poll.id, v.option.id, count(v) from PollVote v where v.poll.id in :pollIds group by v.poll.id, v.option.id")
    List<Object[]> countByOption(@Param("pollIds") Collection<Long> pollIds);

    /** Lignes (sondage, option choisie) pour un utilisateur. */
    @Query("select v.poll.id, v.option.id from PollVote v where v.user.id = :userId and v.poll.id in :pollIds")
    List<Object[]> choicesOf(@Param("userId") Long userId, @Param("pollIds") Collection<Long> pollIds);
}
