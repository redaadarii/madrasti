package ma.madrasti.homework;

import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.homework.HomeworkDtos.*;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.Student;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class HomeworkService {

    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final StudentAccess access;
    private final Clock clock;
    private final ma.madrasti.notification.NotificationService notifier;

    public HomeworkService(AssignmentRepository assignments, SubmissionRepository submissions,
                           ClassroomRepository classrooms, UserRepository users, StudentAccess access, Clock clock,
                           ma.madrasti.notification.NotificationService notifier) {
        this.assignments = assignments;
        this.submissions = submissions;
        this.classrooms = classrooms;
        this.users = users;
        this.access = access;
        this.clock = clock;
        this.notifier = notifier;
    }

    /**
     * Élève : les devoirs de sa classe avec sa copie. Parent : ceux d'un enfant ({@code studentId} requis).
     * Personnel : tous les devoirs (filtrables par classe), ou ceux d'un élève donné.
     */
    @Transactional(readOnly = true)
    public List<AssignmentResponse> list(Long classroomId, Long studentId) {
        var current = CurrentUser.get();
        Student student = switch (current.role()) {
            case STUDENT -> access.requireSelf();
            case PARENT -> {
                if (studentId == null) {
                    throw new AccessDeniedException("Paramètre studentId requis");
                }
                yield access.requireReadable(studentId);
            }
            default -> studentId == null ? null : access.requireReadable(studentId);
        };
        var list = student == null
                ? assignments.findForClassroom(classroomId)
                : assignments.findForClassroom(student.getClassroom().getId());
        Map<Long, Long> counts = list.isEmpty() ? Map.of()
                : submissions.countByAssignment(list.stream().map(Assignment::getId).toList()).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        Map<Long, Submission> own = student == null ? Map.of()
                : submissions.findByStudentId(student.getId()).stream()
                .collect(Collectors.toMap(s -> s.getAssignment().getId(), Function.identity()));
        var zone = clock.getZone();
        return list.stream().map(a -> {
            var mine = own.get(a.getId());
            return AssignmentResponse.from(a, counts.getOrDefault(a.getId(), 0L),
                    mine == null ? null : SubmissionResponse.from(mine, zone));
        }).toList();
    }

    public AssignmentResponse create(AssignmentRequest request) {
        var classroom = classrooms.findById(request.classroomId())
                .orElseThrow(() -> new NotFoundException("classroom", request.classroomId()));
        var teacher = users.getReferenceById(CurrentUser.get().id());
        var saved = assignments.save(new Assignment(classroom, teacher, request.subject(), request.title(),
                request.description(), request.dueDate()));
        notifier.notify(notifier.classroom(classroom.getId(), true), ma.madrasti.notification.NotificationType.HOMEWORK, "/homework",
                java.util.Map.of("title", request.title(), "subject", request.subject(), "date", request.dueDate().toString()));
        return AssignmentResponse.from(saved, 0, null);
    }

    public void delete(Long id) {
        var assignment = find(id);
        var current = CurrentUser.get();
        if (current.role() == Role.TEACHER && !assignment.getTeacher().getId().equals(current.id())) {
            throw new AccessDeniedException("Seul l'auteur peut supprimer ce devoir");
        }
        assignments.delete(assignment);
    }

    public SubmissionResponse submit(Long assignmentId, String content) {
        var assignment = find(assignmentId);
        var student = access.requireSelf();
        if (!assignment.getClassroom().getId().equals(student.getClassroom().getId())) {
            throw new AccessDeniedException("Ce devoir ne concerne pas votre classe");
        }
        var submission = submissions.findByAssignmentIdAndStudentId(assignmentId, student.getId())
                .orElseGet(() -> new Submission(assignment, student));
        if (submission.isReviewed()) {
            throw new ConflictException("error.assignment.alreadyReviewed");
        }
        submission.submit(content, clock.instant());
        return SubmissionResponse.from(submissions.save(submission), clock.getZone());
    }

    @Transactional(readOnly = true)
    public List<SubmissionResponse> submissions(Long assignmentId) {
        find(assignmentId);
        return submissions.findByAssignmentIdOrderBySubmittedAtAsc(assignmentId).stream()
                .map(s -> SubmissionResponse.from(s, clock.getZone())).toList();
    }

    public SubmissionResponse review(Long submissionId, ReviewRequest request) {
        var submission = submissions.findById(submissionId)
                .orElseThrow(() -> new NotFoundException("submission", submissionId));
        submission.review(request.score(), request.feedback());
        notifier.notify(notifier.family(submission.getStudent()), ma.madrasti.notification.NotificationType.HOMEWORK_REVIEWED, "/homework",
                java.util.Map.of("title", submission.getAssignment().getTitle(), "score", request.score().stripTrailingZeros().toPlainString(),
                        "name", submission.getStudent().getFirstName()));
        return SubmissionResponse.from(submission, clock.getZone());
    }

    private Assignment find(Long id) {
        return assignments.findById(id).orElseThrow(() -> new NotFoundException("assignment", id));
    }
}
