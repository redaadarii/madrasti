package ma.madrasti.attendance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.notification.NotificationType;
import ma.madrasti.storage.StorageService;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.student.StudentRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/absences")
@Transactional
public class AttendanceController {

    public record AbsenceRequest(@NotNull Long studentId, @NotNull @PastOrPresent LocalDate day,
                                 @NotNull AbsenceKind kind, String reason) {
    }

    public record JustifyRequest(@NotBlank String reason) {
    }

    public record ReviewRequest(@NotNull Boolean accepted) {
    }

    public record AbsenceResponse(Long id, Long studentId, String studentName, String classroomName,
                                  LocalDate day, AbsenceKind kind, boolean justified, String reason,
                                  Absence.JustificationStatus justificationStatus, String justificationNote,
                                  String justificationFileId, String justificationFileName) {

        static AbsenceResponse from(Absence a) {
            var s = a.getStudent();
            var file = a.getJustificationFile();
            return new AbsenceResponse(a.getId(), s.getId(), s.fullName(), s.getClassroom().getName(), a.getDay(),
                    a.getKind(), a.isJustified(), a.getReason(), a.getJustificationStatus(), a.getJustificationNote(),
                    file == null ? null : file.getId(), file == null ? null : file.getOriginalName());
        }
    }

    private final AbsenceRepository absences;
    private final StudentRepository students;
    private final StudentAccess access;
    private final ma.madrasti.notification.NotificationService notifier;
    private final ma.madrasti.sms.SmsService sms;
    private final StorageService storage;
    private final UserRepository users;

    public AttendanceController(AbsenceRepository absences, StudentRepository students, StudentAccess access,
                                ma.madrasti.notification.NotificationService notifier, ma.madrasti.sms.SmsService sms,
                                StorageService storage, UserRepository users) {
        this.absences = absences;
        this.students = students;
        this.access = access;
        this.notifier = notifier;
        this.sms = sms;
        this.storage = storage;
        this.users = users;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<AbsenceResponse> list(@RequestParam(required = false) Long studentId) {
        if (studentId != null) {
            access.requireReadable(studentId);
            return absences.findByStudentIdOrderByDayDesc(studentId).stream().map(AbsenceResponse::from).toList();
        }
        requireStaffListing();
        return absences.findAllByOrderByDayDesc(PageRequest.of(0, 100)).stream().map(AbsenceResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public AbsenceResponse record(@Valid @RequestBody AbsenceRequest request) {
        var student = students.findById(request.studentId())
                .orElseThrow(() -> new NotFoundException("student", request.studentId()));
        var absence = absences.save(new Absence(student, request.day(), request.kind(), request.reason()));
        notifier.notify(notifier.family(student), ma.madrasti.notification.NotificationType.ABSENCE, "/students/" + student.getId(),
                java.util.Map.of("name", student.getFirstName(), "date", request.day().toString(), "kind", request.kind().name()));
        sms.absenceAlert(student, absence);
        return AbsenceResponse.from(absence);
    }

    @PatchMapping("/{id}/justify")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public AbsenceResponse justify(@PathVariable Long id, @Valid @RequestBody JustifyRequest request) {
        var absence = absences.findById(id).orElseThrow(() -> new NotFoundException("absence", id));
        absence.justify(request.reason());
        return AbsenceResponse.from(absence);
    }

    /** Justificatifs envoyés par les familles et en attente de validation. */
    @GetMapping("/justifications")
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public List<AbsenceResponse> pendingJustifications() {
        return absences.findByJustificationStatusOrderByDayDesc(Absence.JustificationStatus.PENDING).stream()
                .map(AbsenceResponse::from).toList();
    }

    /** Le parent explique l'absence de son enfant, avec un justificatif facultatif (PDF ou photo). */
    @PostMapping(path = "/{id}/justification", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('PARENT')")
    public AbsenceResponse submitJustification(@PathVariable Long id, @RequestParam String note,
                                               @RequestParam(required = false) MultipartFile file) {
        var absence = absences.findById(id).orElseThrow(() -> new NotFoundException("absence", id));
        var student = absence.getStudent();
        var parent = student.getParent();
        if (parent == null || !parent.getId().equals(CurrentUser.get().id())) {
            throw new NotFoundException("absence", id);
        }
        if (note.isBlank() || note.length() > 500) {
            throw new ConflictException("validation.justification.note");
        }
        absence.submitJustification(note.strip(), file == null || file.isEmpty() ? null : storage.storeDocument(file));
        var reviewers = new java.util.ArrayList<>(users.findByRoleInAndActiveTrue(java.util.Set.of(Role.DIRECTOR)));
        if (student.getClassroom().getMainTeacher() != null) {
            reviewers.add(student.getClassroom().getMainTeacher());
        }
        notifier.notify(reviewers, NotificationType.JUSTIFICATION, "/attendance",
                java.util.Map.of("name", student.fullName(), "date", absence.getDay().toString(), "status", "PENDING"));
        return AbsenceResponse.from(absence);
    }

    @PatchMapping("/{id}/justification")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public AbsenceResponse reviewJustification(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        var absence = absences.findById(id).orElseThrow(() -> new NotFoundException("absence", id));
        absence.reviewJustification(request.accepted());
        var student = absence.getStudent();
        notifier.notify(notifier.family(student), NotificationType.JUSTIFICATION, "/students/" + student.getId(),
                java.util.Map.of("name", student.getFirstName(), "date", absence.getDay().toString(),
                        "status", absence.getJustificationStatus().name()));
        return AbsenceResponse.from(absence);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        absences.deleteById(id);
    }

    private static void requireStaffListing() {
        if (!ma.madrasti.auth.CurrentUser.get().isStaff()) {
            throw new org.springframework.security.access.AccessDeniedException("Paramètre studentId requis");
        }
    }
}
