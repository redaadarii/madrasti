package ma.madrasti.course;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface CourseResourceRepository extends JpaRepository<CourseResource, Long> {

    @EntityGraph(attributePaths = {"classroom", "teacher", "file"})
    @Query("select r from CourseResource r where (:classroomId is null or r.classroom.id = :classroomId) order by r.subject, r.createdAt desc")
    List<CourseResource> findForClassroom(@Param("classroomId") Long classroomId);

    @EntityGraph(attributePaths = {"classroom", "teacher", "file"})
    @Query("select r from CourseResource r where r.classroom.id in :ids order by r.subject, r.createdAt desc")
    List<CourseResource> findForClassrooms(@Param("ids") Collection<Long> ids);
}
