package ma.madrasti.calendar;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface SchoolEventRepository extends JpaRepository<SchoolEvent, Long> {

    @EntityGraph(attributePaths = {"classroom", "author"})
    @Query("select e from SchoolEvent e where e.startsAt >= :from and e.startsAt < :to order by e.startsAt")
    List<SchoolEvent> findBetween(@Param("from") Instant from, @Param("to") Instant to);

    @EntityGraph(attributePaths = {"classroom", "author"})
    @Query("""
            select e from SchoolEvent e
            where e.startsAt >= :from and e.startsAt < :to and (e.classroom is null or e.classroom.id in :classroomIds)
            order by e.startsAt
            """)
    List<SchoolEvent> findBetweenFor(@Param("from") Instant from, @Param("to") Instant to,
                                     @Param("classroomIds") Collection<Long> classroomIds);
}
