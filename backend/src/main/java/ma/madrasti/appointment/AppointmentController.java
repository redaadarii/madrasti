package ma.madrasti.appointment;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.notification.NotificationService;
import ma.madrasti.notification.NotificationType;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Rendez-vous parents-professeurs : l'enseignant publie une série de créneaux, le parent en réserve un
 * pour l'un de ses enfants. Chacun peut annuler ; l'autre partie est prévenue.
 */
@RestController
@RequestMapping("/api/appointments")
@Transactional
public class AppointmentController {

    public record SlotsRequest(@NotNull @FutureOrPresent LocalDate date, @NotNull LocalTime startTime,
                               @Min(1) @Max(16) int count, @Min(5) @Max(120) int durationMinutes,
                               @NotNull AppointmentSlot.Mode mode, @Size(max = 150) String location) {
    }

    public record BookRequest(@NotNull Long studentId, @Size(max = 300) String topic) {
    }

    public record SlotView(Long id, Long teacherId, String teacherName, LocalDateTime startsAt, int durationMinutes,
                           AppointmentSlot.Mode mode, String location, boolean booked, boolean mine,
                           String parentName, Long studentId, String studentName, String classroomName, String topic) {

        static SlotView of(AppointmentSlot slot, Long viewerId) {
            var parent = slot.getParent();
            var student = slot.getStudent();
            var mine = parent != null && parent.getId().equals(viewerId);
            // Un parent ne voit pas qui a réservé les autres créneaux.
            var visible = mine || slot.getTeacher().getId().equals(viewerId) || !isParent();
            return new SlotView(slot.getId(), slot.getTeacher().getId(), slot.getTeacher().fullName(), slot.getStartsAt(),
                    slot.getDurationMinutes(), slot.getMode(), slot.getLocation(), slot.isBooked(), mine,
                    visible && parent != null ? parent.fullName() : null,
                    visible && student != null ? student.getId() : null,
                    visible && student != null ? student.fullName() : null,
                    visible && student != null ? student.getClassroom().getName() : null,
                    visible ? slot.getTopic() : null);
        }

        private static boolean isParent() {
            return CurrentUser.get().role() == Role.PARENT;
        }
    }

    private final AppointmentSlotRepository slots;
    private final StudentRepository students;
    private final UserRepository users;
    private final NotificationService notifier;
    private final Clock clock;

    public AppointmentController(AppointmentSlotRepository slots, StudentRepository students, UserRepository users,
                                 NotificationService notifier, Clock clock) {
        this.slots = slots;
        this.students = students;
        this.users = users;
        this.notifier = notifier;
        this.clock = clock;
    }

    /** Personnel : ses propres créneaux à venir. Parent : créneaux libres et ses réservations. */
    @GetMapping
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER','PARENT')")
    public List<SlotView> list() {
        var me = CurrentUser.get();
        var now = LocalDateTime.now(clock);
        var list = me.role() == Role.PARENT
                ? slots.findOpenFor(me.id(), now)
                : slots.findByTeacherIdAndStartsAtAfterOrderByStartsAt(me.id(), now);
        return list.stream().map(s -> SlotView.of(s, me.id())).toList();
    }

    /** Publie {@code count} créneaux consécutifs ; refuse s'ils chevauchent des créneaux existants. */
    @PostMapping("/slots")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('DIRECTOR','TEACHER')")
    public List<SlotView> publish(@Valid @RequestBody SlotsRequest request) {
        var me = CurrentUser.get();
        var teacher = users.getReferenceById(me.id());
        var first = request.date().atTime(request.startTime());
        if (!first.isAfter(LocalDateTime.now(clock))) {
            throw new ConflictException("error.appointment.past");
        }
        var existing = slots.findByTeacherIdAndStartsAtAfterOrderByStartsAt(me.id(), first.minusHours(3));
        var created = new ArrayList<AppointmentSlot>();
        for (var i = 0; i < request.count(); i++) {
            var start = first.plusMinutes((long) i * request.durationMinutes());
            var end = start.plusMinutes(request.durationMinutes());
            if (existing.stream().anyMatch(s -> s.getStartsAt().isBefore(end) && s.getEndsAt().isAfter(start))) {
                throw new ConflictException("error.appointment.overlap");
            }
            created.add(new AppointmentSlot(teacher, start, request.durationMinutes(), request.mode(),
                    request.location() == null || request.location().isBlank() ? null : request.location().strip()));
        }
        return slots.saveAll(created).stream().map(s -> SlotView.of(s, me.id())).toList();
    }

    @PostMapping("/slots/{id}/book")
    @PreAuthorize("hasRole('PARENT')")
    public SlotView book(@PathVariable Long id, @Valid @RequestBody BookRequest request) {
        var me = CurrentUser.get();
        var slot = slots.findById(id).orElseThrow(() -> new NotFoundException("slot", id));
        var student = students.findById(request.studentId())
                .filter(s -> s.getParent() != null && s.getParent().getId().equals(me.id()))
                .orElseThrow(() -> new NotFoundException("student", request.studentId()));
        if (!slot.getStartsAt().isAfter(LocalDateTime.now(clock))) {
            throw new ConflictException("error.appointment.past");
        }
        var parent = users.getReferenceById(me.id());
        var topic = request.topic() == null || request.topic().isBlank() ? null : request.topic().strip();
        if (slots.book(id, parent, student, topic) == 0) {
            throw new ConflictException("error.appointment.taken");
        }
        var booked = slots.findById(id).orElseThrow();
        notifier.notify(List.of(booked.getTeacher()), NotificationType.APPOINTMENT, "/appointments",
                params(booked, booked.getParent().fullName(), "BOOKED"));
        return SlotView.of(booked, me.id());
    }

    /** Annulation par le parent qui a réservé ou par l'enseignant : le créneau redevient libre. */
    @PostMapping("/slots/{id}/cancel")
    public SlotView cancel(@PathVariable Long id) {
        var me = CurrentUser.get();
        var slot = slots.findById(id).orElseThrow(() -> new NotFoundException("slot", id));
        var parent = slot.getParent();
        var isTeacher = slot.getTeacher().getId().equals(me.id());
        var isParent = parent != null && parent.getId().equals(me.id());
        if (!isTeacher && !isParent) {
            throw new NotFoundException("slot", id);
        }
        if (parent != null) {
            User other = isTeacher ? parent : slot.getTeacher();
            notifier.notify(List.of(other), NotificationType.APPOINTMENT, "/appointments",
                    params(slot, isTeacher ? slot.getTeacher().fullName() : parent.fullName(), "CANCELLED"));
        }
        slot.cancelBooking();
        return SlotView.of(slot, me.id());
    }

    @DeleteMapping("/slots/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        var slot = slots.findById(id).orElseThrow(() -> new NotFoundException("slot", id));
        if (!slot.getTeacher().getId().equals(CurrentUser.get().id())) {
            throw new AccessDeniedException("owner-only");
        }
        if (slot.isBooked()) {
            throw new ConflictException("error.appointment.booked");
        }
        slots.delete(slot);
    }

    private static Map<String, String> params(AppointmentSlot slot, String who, String status) {
        return Map.of("who", who, "date", slot.getStartsAt().toString(), "status", status);
    }
}
