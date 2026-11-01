package ma.madrasti.quiz;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {

    Optional<QuizAttempt> findByQuizIdAndStudentId(Long quizId, Long studentId);

    @EntityGraph(attributePaths = "quiz")
    List<QuizAttempt> findByStudentId(Long studentId);

    @EntityGraph(attributePaths = "student")
    List<QuizAttempt> findByQuizIdOrderByScoreDesc(Long quizId);

    @Query("""
            select a.quiz.id, count(a), avg(a.score * 100.0 / a.total) from QuizAttempt a
            where a.quiz.id in :ids group by a.quiz.id
            """)
    List<Object[]> statsByQuiz(@Param("ids") Collection<Long> ids);
}
