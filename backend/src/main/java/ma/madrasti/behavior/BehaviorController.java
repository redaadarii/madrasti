package ma.madrasti.behavior;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.notification.NotificationService;
import ma.madrasti.notification.NotificationType;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Suivi du comportement : points positifs pour encourager, incidents et sanctions pour la vie scolaire. */
@RestController
@RequestMapping("/api/behavior")
@Transactional
public class BehaviorController {

    public record BehaviorRequest(@NotNull Long studentId, @NotNull BehaviorRecord.Category category,
                                  BehaviorRecord.Sanction sanction, @Size(max = 500) String note,
                                  @PastOrPresent LocalDate occurredOn) {
    }

    public record BehaviorView(Long id, Long studentId, String studentName, BehaviorRecord.Category category,
                               int points, boolean positive, BehaviorRecord.Sanction sanction, String note,
                               LocalDate occurredOn, String authorName) {

        static BehaviorView from(BehaviorRecord r) {
            return new BehaviorView(r.getId(), r.getStudent().getId(), r.getStudent().fullName(), r.getCategory(),
                    r.getCategory().points(), r.getCategory().positive(), r.getSanction(), r.getNote(), r.getOccurredOn(),
                    r.getAuthor() == null ? null : r.getAuthor().fullName());
        }
    }

    public record StudentBehavior(List<BehaviorView> records, long positives, long incidents, int balance) {
    }

    public record ClassroomRow(Long studentId, String studentName, long positives, long incidents, int balance) {
    }

    private final BehaviorRecordRepository records;
    private final StudentRepository students;
    private final StudentAccess access;
    private final UserRepository users;
    private final NotificationService notifier;
    private final Clock clock;

    public BehaviorController(BehaviorRecordRepository records, StudentRepository students, StudentAccess access,
                              UserRepository users, NotificationService notifier, Clock clock) {
        this.records = records;
        this.students = students;
        this.access = access;
        this.users = users;
        this.notifier = notifier;
        this.clock = clock;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public StudentBehavior forStudent(@RequestParam Long studentId) {
        access.requireReadable(studentId);
        var list = records.findByStudentIdOrderByOccurredOnDescIdDesc(studentId).stream().map(BehaviorView::from).toList();
        return new StudentBehavior(list, list.stream().filter(BehaviorView::positive).count(),
                list.stream().filter(v -> !v.positive()).count(), list.stream().mapToInt(BehaviorView::points).sum());
    }

    /** Bilan de la classe, du meilleur solde au plus faible, et dernières observations. */
    @GetMapping("/classrooms/{classroomId}")
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public Map<String, Object> forClassroom(@PathVariable Long classroomId) {
        var all = records.findByStudentClassroomIdOrderByOccurredOnDescIdDesc(classroomId);
        var byStudent = all.stream().collect(Collectors.groupingBy(r -> r.getStudent().getId()));
        var rows = students.findByClassroomId(classroomId).stream().map(student -> {
            var mine = byStudent.getOrDefault(student.getId(), List.of());
            var positives = mine.stream().filter(r -> r.getCategory().positive()).count();
            return new ClassroomRow(student.getId(), student.fullName(), positives, mine.size() - positives,
                    mine.stream().mapToInt(r -> r.getCategory().points()).sum());
        }).sorted(Comparator.comparingInt(ClassroomRow::balance).reversed().thenComparing(ClassroomRow::studentName)).toList();
        return Map.of("students", rows, "recent", all.stream().limit(20).map(BehaviorView::from).toList());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public BehaviorView record(@Valid @RequestBody BehaviorRequest request) {
        var student = students.findById(request.studentId())
                .orElseThrow(() -> new NotFoundException("student", request.studentId()));
        if (request.category().positive() && request.sanction() != null) {
            throw new ConflictException("error.behavior.sanctionOnPositive");
        }
        var note = request.note() == null || request.note().isBlank() ? null : request.note().strip();
        var saved = records.save(new BehaviorRecord(student, users.getReferenceById(CurrentUser.get().id()),
                request.category(), request.sanction(), note,
                request.occurredOn() == null ? LocalDate.now(clock) : request.occurredOn()));
        notifier.notify(notifier.family(student), NotificationType.BEHAVIOR, "/behavior",
                Map.of("name", student.getFirstName(), "category", request.category().name(),
                        "positive", String.valueOf(request.category().positive())));
        return BehaviorView.from(saved);
    }

    /** L'auteur ou la direction. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        var record = records.findById(id).orElseThrow(() -> new NotFoundException("behavior", id));
        var me = CurrentUser.get();
        var isAuthor = record.getAuthor() != null && record.getAuthor().getId().equals(me.id());
        if (me.role() == Role.TEACHER && !isAuthor) {
            throw new AccessDeniedException("author-only");
        }
        records.delete(record);
    }
}
