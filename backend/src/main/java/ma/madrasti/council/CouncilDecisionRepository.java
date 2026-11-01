package ma.madrasti.council;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CouncilDecisionRepository extends JpaRepository<CouncilDecision, Long> {

    Optional<CouncilDecision> findByStudentIdAndTerm(Long studentId, String term);

    List<CouncilDecision> findByStudentClassroomIdAndTerm(Long classroomId, String term);
}
