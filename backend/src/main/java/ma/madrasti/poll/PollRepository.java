package ma.madrasti.poll;

import ma.madrasti.announcement.Audience;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface PollRepository extends JpaRepository<Poll, Long> {

    /** Sondages adressés à l'une de ces audiences, plus ceux que l'utilisateur a lui-même créés. */
    @EntityGraph(attributePaths = {"options", "author"})
    @Query("select distinct p from Poll p where p.audience in :audiences or p.author.id = :userId order by p.createdAt desc")
    List<Poll> findVisible(@Param("audiences") Collection<Audience> audiences, @Param("userId") Long userId);
}
