package ma.madrasti.school;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ClassroomRepository extends JpaRepository<Classroom, Long> {

    @EntityGraph(attributePaths = {"school", "mainTeacher"})
    @Query("select c from Classroom c order by c.school.name, c.level, c.name")
    List<Classroom> findAllDetailed();

    @Query("select c.id, count(s) from Student s join s.classroom c group by c.id")
    List<Object[]> countStudentsPerClassroom();
}
