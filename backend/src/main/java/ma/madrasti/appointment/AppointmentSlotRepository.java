package ma.madrasti.appointment;

import ma.madrasti.student.Student;
import ma.madrasti.user.User;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentSlotRepository extends JpaRepository<AppointmentSlot, Long> {

    @EntityGraph(attributePaths = {"teacher", "parent", "student", "student.classroom"})
    List<AppointmentSlot> findByTeacherIdAndStartsAtAfterOrderByStartsAt(Long teacherId, LocalDateTime after);

    /** Créneaux à venir encore libres, et ceux réservés par ce parent. */
    @EntityGraph(attributePaths = {"teacher", "parent", "student", "student.classroom"})
    @Query("""
            select s from AppointmentSlot s
            where s.startsAt > :after and (s.parent is null or s.parent.id = :parentId)
            order by s.startsAt""")
    List<AppointmentSlot> findOpenFor(@Param("parentId") Long parentId, @Param("after") LocalDateTime after);

    /**
     * Réservation atomique : la mise à jour échoue (0 ligne) si un autre parent a pris le créneau entre-temps,
     * sans verrou ni version sur l'entité.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update AppointmentSlot s set s.parent = :parent, s.student = :student, s.topic = :topic
            where s.id = :id and s.parent is null""")
    int book(@Param("id") Long id, @Param("parent") User parent, @Param("student") Student student,
             @Param("topic") String topic);
}
