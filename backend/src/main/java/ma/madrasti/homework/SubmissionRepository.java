package ma.madrasti.homework;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    Optional<Submission> findByAssignmentIdAndStudentId(Long assignmentId, Long studentId);

    @EntityGraph(attributePaths = {"assignment", "student"})
    List<Submission> findByStudentId(Long studentId);

    @EntityGraph(attributePaths = {"assignment", "student"})
    List<Submission> findByAssignmentIdOrderBySubmittedAtAsc(Long assignmentId);

    @Query("select s.assignment.id, count(s) from Submission s where s.assignment.id in :ids group by s.assignment.id")
    List<Object[]> countByAssignment(Collection<Long> ids);
}
