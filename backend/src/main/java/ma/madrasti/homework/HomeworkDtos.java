package ma.madrasti.homework;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

public final class HomeworkDtos {

    private HomeworkDtos() {
    }

    public record AssignmentRequest(@NotNull Long classroomId, @NotBlank String subject,
                                    @NotBlank @Size(max = 150) String title, @NotBlank String description,
                                    @NotNull @FutureOrPresent LocalDate dueDate) {
    }

    public record SubmitRequest(@NotBlank @Size(max = 20_000) String content) {
    }

    public record ReviewRequest(@NotNull @DecimalMin("0") @DecimalMax("20") BigDecimal score,
                                @Size(max = 1000) String feedback) {
    }

    public record SubmissionResponse(Long id, Long assignmentId, Long studentId, String studentName, String content,
                                     Instant submittedAt, boolean late, BigDecimal score, String feedback) {

        static SubmissionResponse from(Submission s, ZoneId zone) {
            return new SubmissionResponse(s.getId(), s.getAssignment().getId(), s.getStudent().getId(),
                    s.getStudent().fullName(), s.getContent(), s.getSubmittedAt(), s.isLate(zone), s.getScore(),
                    s.getFeedback());
        }
    }

    /** {@code submission} : copie de l'élève consulté (espace élève/parent), {@code null} côté enseignant. */
    public record AssignmentResponse(Long id, Long classroomId, String classroomName, Long teacherId, String teacherName,
                                     String subject, String title, String description, LocalDate dueDate,
                                     Instant createdAt, long submissionCount, SubmissionResponse submission) {

        static AssignmentResponse from(Assignment a, long submissionCount, SubmissionResponse submission) {
            return new AssignmentResponse(a.getId(), a.getClassroom().getId(), a.getClassroom().getName(),
                    a.getTeacher().getId(), a.getTeacher().fullName(), a.getSubject(), a.getTitle(),
                    a.getDescription(), a.getDueDate(), a.getCreatedAt(), submissionCount, submission);
        }
    }
}
