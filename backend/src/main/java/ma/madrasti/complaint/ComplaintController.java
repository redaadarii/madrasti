package ma.madrasti.complaint;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

/** Réclamations des familles, traitées et suivies par la direction. */
@RestController
@RequestMapping("/api/complaints")
@Transactional
public class ComplaintController {

    public record ComplaintRequest(@NotNull Complaint.Category category, @NotBlank @Size(max = 150) String subject,
                                   @NotBlank @Size(max = 5000) String body, Long studentId) {
    }

    public record HandleRequest(@NotNull Complaint.Status status, @Size(max = 5000) String response) {
    }

    public record ComplaintResponse(Long id, Long authorId, String authorName, Long studentId, String studentName,
                                    Complaint.Category category, String subject, String body, Complaint.Status status,
                                    String response, Instant createdAt, Instant updatedAt) {

        static ComplaintResponse from(Complaint c) {
            var student = c.getStudent();
            return new ComplaintResponse(c.getId(), c.getAuthor().getId(), c.getAuthor().fullName(),
                    student == null ? null : student.getId(), student == null ? null : student.fullName(),
                    c.getCategory(), c.getSubject(), c.getBody(), c.getStatus(), c.getResponse(), c.getCreatedAt(),
                    c.getUpdatedAt());
        }
    }

    private final ComplaintRepository complaints;
    private final UserRepository users;
    private final StudentAccess access;
    private final ma.madrasti.notification.NotificationService notifier;

    public ComplaintController(ComplaintRepository complaints, UserRepository users, StudentAccess access,
                               ma.madrasti.notification.NotificationService notifier) {
        this.complaints = complaints;
        this.users = users;
        this.access = access;
        this.notifier = notifier;
    }

    /** La direction voit toutes les réclamations ; chacun voit les siennes. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<ComplaintResponse> list() {
        var current = CurrentUser.get();
        var list = current.role() == Role.ADMIN || current.role() == Role.DIRECTOR
                ? complaints.findAllDetailed() : complaints.findByAuthorIdOrderByCreatedAtDesc(current.id());
        return list.stream().map(ComplaintResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ComplaintResponse create(@Valid @RequestBody ComplaintRequest request) {
        var student = request.studentId() == null ? null : access.requireReadable(request.studentId());
        var author = users.getReferenceById(CurrentUser.get().id());
        return ComplaintResponse.from(complaints.save(
                new Complaint(author, student, request.category(), request.subject(), request.body())));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public ComplaintResponse handle(@PathVariable Long id, @Valid @RequestBody HandleRequest request) {
        var complaint = complaints.findById(id).orElseThrow(() -> new NotFoundException("complaint", id));
        complaint.handle(request.status(), request.response());
        notifier.notify(java.util.List.of(complaint.getAuthor()), ma.madrasti.notification.NotificationType.COMPLAINT_UPDATED, "/complaints",
                java.util.Map.of("subject", complaint.getSubject(), "status", request.status().name()));
        return ComplaintResponse.from(complaint);
    }
}
