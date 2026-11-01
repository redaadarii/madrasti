package ma.madrasti.behavior;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BehaviorRecordRepository extends JpaRepository<BehaviorRecord, Long> {

    @EntityGraph(attributePaths = {"student", "student.classroom", "author"})
    List<BehaviorRecord> findByStudentIdOrderByOccurredOnDescIdDesc(Long studentId);

    @EntityGraph(attributePaths = {"student", "student.classroom", "author"})
    List<BehaviorRecord> findByStudentClassroomIdOrderByOccurredOnDescIdDesc(Long classroomId);
}
