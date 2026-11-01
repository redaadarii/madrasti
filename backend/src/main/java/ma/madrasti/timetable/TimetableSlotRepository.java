package ma.madrasti.timetable;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalTime;
import java.util.List;

public interface TimetableSlotRepository extends JpaRepository<TimetableSlot, Long> {

    @EntityGraph(attributePaths = {"classroom", "teacher"})
    List<TimetableSlot> findByClassroomIdOrderByDayOfWeekAscStartTimeAsc(Long classroomId);

    @EntityGraph(attributePaths = {"classroom", "teacher"})
    List<TimetableSlot> findByTeacherIdOrderByDayOfWeekAscStartTimeAsc(Long teacherId);

    @Query("""
            select count(s) > 0 from TimetableSlot s
            where s.classroom.id = :classroomId and s.dayOfWeek = :day and s.startTime < :end and s.endTime > :start
            """)
    boolean classroomBusy(@Param("classroomId") Long classroomId, @Param("day") int day,
                          @Param("start") LocalTime start, @Param("end") LocalTime end);

    @Query("""
            select count(s) > 0 from TimetableSlot s
            where s.teacher.id = :teacherId and s.dayOfWeek = :day and s.startTime < :end and s.endTime > :start
            """)
    boolean teacherBusy(@Param("teacherId") Long teacherId, @Param("day") int day,
                        @Param("start") LocalTime start, @Param("end") LocalTime end);

    long countByClassroomId(Long classroomId);
}
