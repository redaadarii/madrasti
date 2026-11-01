package ma.madrasti.live;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface LiveSessionRepository extends JpaRepository<LiveSession, Long> {

    @EntityGraph(attributePaths = {"classroom", "teacher"})
    List<LiveSession> findByStartsAtAfterOrderByStartsAtAsc(Instant from);

    @EntityGraph(attributePaths = {"classroom", "teacher"})
    List<LiveSession> findByClassroomIdInAndStartsAtAfterOrderByStartsAtAsc(Collection<Long> classroomIds, Instant from);
}
