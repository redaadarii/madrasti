package ma.madrasti.quiz;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

    @EntityGraph(attributePaths = {"classroom", "teacher"})
    @Query("select q from Quiz q where (:classroomId is null or q.classroom.id = :classroomId) order by q.dueDate desc")
    List<Quiz> findForClassroom(@Param("classroomId") Long classroomId);

    @Query("select size(q.questions) from Quiz q where q.id = :id")
    int questionCount(@Param("id") Long id);
}
