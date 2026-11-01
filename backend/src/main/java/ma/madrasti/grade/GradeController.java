package ma.madrasti.grade;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.student.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/grades")
@Transactional
public class GradeController {

    public record GradeRequest(@NotNull Long studentId, @NotBlank String subject, @NotBlank String title,
                               @NotNull @DecimalMin("0") BigDecimal score,
                               @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal maxScore,
                               @NotBlank String term) {

        @AssertTrue(message = "{validation.score.scale}")
        public boolean isScoreWithinScale() {
            return score == null || maxScore == null || score.compareTo(maxScore) <= 0;
        }
    }

    public record GradeResponse(Long id, Long studentId, String subject, String title, BigDecimal score,
                                BigDecimal maxScore, String term, Instant createdAt) {

        static GradeResponse from(Grade g) {
            return new GradeResponse(g.getId(), g.getStudent().getId(), g.getSubject(), g.getTitle(), g.getScore(),
                    g.getMaxScore(), g.getTerm(), g.getCreatedAt());
        }
    }

    private final GradeRepository grades;
    private final StudentRepository students;
    private final StudentAccess access;
    private final ma.madrasti.notification.NotificationService notifier;

    public GradeController(GradeRepository grades, StudentRepository students, StudentAccess access,
                           ma.madrasti.notification.NotificationService notifier) {
        this.grades = grades;
        this.students = students;
        this.access = access;
        this.notifier = notifier;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<GradeResponse> list(@RequestParam Long studentId) {
        access.requireReadable(studentId);
        return grades.findByStudentIdOrderByCreatedAtDesc(studentId).stream().map(GradeResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public GradeResponse create(@Valid @RequestBody GradeRequest request) {
        var student = students.findById(request.studentId())
                .orElseThrow(() -> new NotFoundException("student", request.studentId()));
        var grade = grades.save(new Grade(student, request.subject(), request.title(), request.score(),
                request.maxScore(), request.term()));
        notifier.notify(notifier.family(student), ma.madrasti.notification.NotificationType.GRADE, "/students/" + student.getId(),
                java.util.Map.of("name", student.getFirstName(), "subject", request.subject(),
                        "score", request.score().stripTrailingZeros().toPlainString(), "max", request.maxScore().stripTrailingZeros().toPlainString()));
        return GradeResponse.from(grade);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        grades.deleteById(id);
    }
}
