package ma.madrasti.homework;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface AssignmentRepository extends JpaRepository<Assignment, Long> {

    @EntityGraph(attributePaths = {"classroom", "teacher"})
    @Query("select a from Assignment a where (:classroomId is null or a.classroom.id = :classroomId) order by a.dueDate desc")
    List<Assignment> findForClassroom(@Param("classroomId") Long classroomId);

    @EntityGraph(attributePaths = {"classroom", "teacher"})
    List<Assignment> findByClassroomIdInOrderByDueDateDesc(Collection<Long> classroomIds);
}
