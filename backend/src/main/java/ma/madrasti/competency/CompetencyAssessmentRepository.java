package ma.madrasti.competency;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CompetencyAssessmentRepository extends JpaRepository<CompetencyAssessment, Long> {

    @EntityGraph(attributePaths = {"competency"})
    List<CompetencyAssessment> findByStudentIdAndTerm(Long studentId, String term);

    @EntityGraph(attributePaths = {"competency", "student"})
    List<CompetencyAssessment> findByStudentClassroomIdAndTerm(Long classroomId, String term);

    Optional<CompetencyAssessment> findByStudentIdAndCompetencyIdAndTerm(Long studentId, Long competencyId, String term);
}
