package ma.madrasti.student;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface StudentRepository extends JpaRepository<Student, Long> {

    boolean existsByRegistrationNumber(String registrationNumber);

    @EntityGraph(attributePaths = {"classroom", "classroom.school", "parent", "account"})
    @Query("""
            select s from Student s
            where (:classroomId is null or s.classroom.id = :classroomId)
              and (:q is null
                   or lower(concat(s.firstName, ' ', s.lastName)) like lower(concat('%', cast(:q as string), '%'))
                   or lower(s.registrationNumber) like lower(concat('%', cast(:q as string), '%')))
            """)
    Page<Student> search(@Param("q") String q, @Param("classroomId") Long classroomId, Pageable pageable);

    @EntityGraph(attributePaths = {"classroom", "classroom.school", "parent", "account"})
    List<Student> findByParentIdOrderByFirstName(Long parentId);

    @EntityGraph(attributePaths = {"classroom", "classroom.school", "parent", "account"})
    Optional<Student> findByAccountId(Long userId);

    @EntityGraph(attributePaths = "account")
    List<Student> findByAccountIsNull();

    @EntityGraph(attributePaths = {"classroom", "parent", "account"})
    List<Student> findByClassroomId(Long classroomId);
}
