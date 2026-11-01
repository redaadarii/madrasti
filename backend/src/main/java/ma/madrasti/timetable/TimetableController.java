package ma.madrasti.timetable;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.List;

/** Emploi du temps hebdomadaire, par classe ou par enseignant, sans chevauchement. */
@RestController
@RequestMapping("/api/timetable")
@Transactional
public class TimetableController {

    public record SlotRequest(@NotNull Long classroomId, Long teacherId, @Min(1) @Max(6) int dayOfWeek,
                              @NotNull LocalTime startTime, @NotNull LocalTime endTime, @NotBlank String subject,
                              @Size(max = 40) String room) {

        @AssertTrue(message = "{validation.time.order}")
        public boolean isChronological() {
            return startTime == null || endTime == null || endTime.isAfter(startTime);
        }
    }

    public record SlotResponse(Long id, Long classroomId, String classroomName, Long teacherId, String teacherName,
                               int dayOfWeek, LocalTime startTime, LocalTime endTime, String subject, String room) {

        static SlotResponse from(TimetableSlot s) {
            var teacher = s.getTeacher();
            return new SlotResponse(s.getId(), s.getClassroom().getId(), s.getClassroom().getName(),
                    teacher == null ? null : teacher.getId(), teacher == null ? null : teacher.fullName(),
                    s.getDayOfWeek(), s.getStartTime(), s.getEndTime(), s.getSubject(), s.getRoom());
        }
    }

    private final TimetableSlotRepository slots;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final StudentAccess access;

    public TimetableController(TimetableSlotRepository slots, ClassroomRepository classrooms, UserRepository users,
                               StudentAccess access) {
        this.slots = slots;
        this.classrooms = classrooms;
        this.users = users;
        this.access = access;
    }

    /** Élève : sa classe. Parent : une classe d'un de ses enfants. Enseignant sans filtre : son propre planning. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<SlotResponse> list(@RequestParam(required = false) Long classroomId,
                                   @RequestParam(required = false) Long teacherId) {
        var current = CurrentUser.get();
        var visible = access.visibleClassroomIds();
        if (visible != null) {
            var target = classroomId != null ? classroomId : visible.stream().findFirst().orElse(null);
            if (target == null || !visible.contains(target)) {
                throw new AccessDeniedException("Emploi du temps non accessible");
            }
            return toResponses(slots.findByClassroomIdOrderByDayOfWeekAscStartTimeAsc(target));
        }
        if (classroomId != null) {
            return toResponses(slots.findByClassroomIdOrderByDayOfWeekAscStartTimeAsc(classroomId));
        }
        var teacher = teacherId != null ? teacherId : current.role() == Role.TEACHER ? current.id() : null;
        return teacher == null ? List.of() : toResponses(slots.findByTeacherIdOrderByDayOfWeekAscStartTimeAsc(teacher));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public SlotResponse create(@Valid @RequestBody SlotRequest request) {
        var classroom = classrooms.findById(request.classroomId())
                .orElseThrow(() -> new NotFoundException("classroom", request.classroomId()));
        if (slots.classroomBusy(classroom.getId(), request.dayOfWeek(), request.startTime(), request.endTime())) {
            throw new ConflictException("error.timetable.classroomBusy");
        }
        var teacher = request.teacherId() == null ? null : users.findById(request.teacherId())
                .filter(u -> u.getRole() == Role.TEACHER)
                .orElseThrow(() -> new NotFoundException("teacher", request.teacherId()));
        if (teacher != null && slots.teacherBusy(teacher.getId(), request.dayOfWeek(), request.startTime(), request.endTime())) {
            throw new ConflictException("error.timetable.teacherBusy", teacher.fullName());
        }
        return SlotResponse.from(slots.save(new TimetableSlot(classroom, teacher, request.dayOfWeek(),
                request.startTime(), request.endTime(), request.subject(), request.room())));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public void delete(@PathVariable Long id) {
        slots.deleteById(id);
    }

    private static List<SlotResponse> toResponses(List<TimetableSlot> list) {
        return list.stream().map(SlotResponse::from).toList();
    }
}
