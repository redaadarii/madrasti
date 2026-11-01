package ma.madrasti.grade;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface GradeRepository extends JpaRepository<Grade, Long> {

    @EntityGraph(attributePaths = "student")
    List<Grade> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    /** Moyenne sur 20 par élève et par matière, pour toute une classe sur un trimestre. */
    @Query("""
            select g.student.id, g.subject, avg(g.score * 20 / g.maxScore), count(g) from Grade g
            where g.student.classroom.id = :classroomId and g.term = :term
            group by g.student.id, g.subject
            """)
    List<Object[]> subjectAveragesForClass(Long classroomId, String term);

    /** Moyenne sur 20 par élève et par matière, tous trimestres confondus (statistiques). */
    @Query("select g.student.id, g.subject, avg(g.score * 20 / g.maxScore) from Grade g group by g.student.id, g.subject")
    List<Object[]> subjectAveragesPerStudent();

    /** Moyenne générale sur 20, toutes évaluations confondues. */
    @Query("select avg(g.score * 20 / g.maxScore) from Grade g")
    Double averageOutOf20();
}
