package ma.madrasti.attendance;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface AbsenceRepository extends JpaRepository<Absence, Long> {

    @EntityGraph(attributePaths = {"student", "student.classroom"})
    List<Absence> findByStudentIdOrderByDayDesc(Long studentId);

    @EntityGraph(attributePaths = {"student", "student.classroom"})
    List<Absence> findAllByOrderByDayDesc(Pageable pageable);

    long countByDayAfter(LocalDate day);

    long countByJustifiedFalse();

    @EntityGraph(attributePaths = {"student", "student.classroom", "justificationFile"})
    List<Absence> findByJustificationStatusOrderByDayDesc(Absence.JustificationStatus status);

    List<Absence> findByDayGreaterThanEqual(LocalDate from);
}
