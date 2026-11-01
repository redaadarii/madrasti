package ma.madrasti.quiz;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.Student;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
public class QuizService {

    public record QuestionRequest(@NotBlank @Size(max = 500) String prompt,
                                  @Size(min = 2, max = 6, message = "{validation.quiz.choices}") List<@NotBlank String> choices,
                                  @Min(0) int correctIndex) {

        @AssertTrue(message = "{validation.quiz.correctIndex}")
        public boolean isCorrectIndexInRange() {
            return choices == null || correctIndex < choices.size();
        }
    }

    public record QuizRequest(@NotNull Long classroomId, @NotBlank String subject, @NotBlank @Size(max = 150) String title,
                              @NotNull @FutureOrPresent LocalDate dueDate,
                              @NotEmpty @Size(max = 30) List<@Valid QuestionRequest> questions) {
    }

    public record AttemptView(int score, int total, Instant submittedAt) {
        static AttemptView from(QuizAttempt a) {
            return new AttemptView(a.getScore(), a.getTotal(), a.getSubmittedAt());
        }
    }

    public record QuizSummary(Long id, Long classroomId, String classroomName, Long teacherId, String teacherName,
                              String subject, String title, LocalDate dueDate, int questionCount, long attemptCount,
                              Double averagePercent, AttemptView myAttempt) {
    }

    /** {@code correctIndex} et {@code myAnswer} ne sont révélés qu'au personnel ou après la tentative. */
    public record QuestionView(Long id, String prompt, List<String> choices, Integer correctIndex, Integer myAnswer) {
    }

    public record QuizDetail(QuizSummary quiz, List<QuestionView> questions) {
    }

    public record AttemptResult(Long id, Long studentId, String studentName, int score, int total, Instant submittedAt) {
        static AttemptResult from(QuizAttempt a) {
            return new AttemptResult(a.getId(), a.getStudent().getId(), a.getStudent().fullName(), a.getScore(),
                    a.getTotal(), a.getSubmittedAt());
        }
    }

    private final QuizRepository quizzes;
    private final QuizAttemptRepository attempts;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final StudentAccess access;
    private final Clock clock;
    private final ma.madrasti.notification.NotificationService notifier;

    QuizService(QuizRepository quizzes, QuizAttemptRepository attempts, ClassroomRepository classrooms,
                UserRepository users, StudentAccess access, Clock clock, ma.madrasti.notification.NotificationService notifier) {
        this.quizzes = quizzes;
        this.attempts = attempts;
        this.classrooms = classrooms;
        this.users = users;
        this.access = access;
        this.clock = clock;
        this.notifier = notifier;
    }

    @Transactional(readOnly = true)
    public List<QuizSummary> list(Long classroomId, Long studentId) {
        var student = targetStudent(studentId);
        var list = quizzes.findForClassroom(student == null ? classroomId : student.getClassroom().getId());
        Map<Long, Object[]> stats = list.isEmpty() ? Map.of()
                : attempts.statsByQuiz(list.stream().map(Quiz::getId).toList()).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], Function.identity()));
        Map<Long, QuizAttempt> own = student == null ? Map.of()
                : attempts.findByStudentId(student.getId()).stream()
                .collect(Collectors.toMap(a -> a.getQuiz().getId(), Function.identity()));
        return list.stream().map(q -> summary(q, stats.get(q.getId()), own.get(q.getId()))).toList();
    }

    @Transactional(readOnly = true)
    public QuizDetail get(Long id) {
        var quiz = find(id);
        var current = CurrentUser.get();
        QuizAttempt mine = null;
        if (!current.isStaff()) {
            var student = current.role() == Role.STUDENT ? access.requireSelf() : null;
            if (student == null || !student.getClassroom().getId().equals(quiz.getClassroom().getId())) {
                throw new AccessDeniedException("Ce quiz ne concerne pas votre classe");
            }
            mine = attempts.findByQuizIdAndStudentId(id, student.getId()).orElse(null);
        }
        var reveal = current.isStaff() || mine != null;
        var answers = mine == null ? List.<Integer>of() : mine.answerList();
        var questions = quiz.getQuestions();
        var views = new java.util.ArrayList<QuestionView>();
        for (var i = 0; i < questions.size(); i++) {
            var q = questions.get(i);
            views.add(new QuestionView(q.getId(), q.getPrompt(), List.copyOf(q.getChoices()),
                    reveal ? q.getCorrectIndex() : null, i < answers.size() ? answers.get(i) : null));
        }
        return new QuizDetail(summary(quiz, null, mine), views);
    }

    public QuizSummary create(QuizRequest request) {
        var classroom = classrooms.findById(request.classroomId())
                .orElseThrow(() -> new NotFoundException("classroom", request.classroomId()));
        var quiz = new Quiz(classroom, users.getReferenceById(CurrentUser.get().id()), request.subject(),
                request.title(), request.dueDate());
        request.questions().forEach(q -> quiz.addQuestion(q.prompt(), q.choices(), q.correctIndex()));
        var saved = quizzes.save(quiz);
        notifier.notify(notifier.classroom(classroom.getId(), false), ma.madrasti.notification.NotificationType.QUIZ, "/quizzes/" + saved.getId(),
                java.util.Map.of("title", request.title(), "subject", request.subject()));
        return summary(saved, null, null);
    }

    public AttemptView attempt(Long id, List<Integer> answers) {
        var quiz = find(id);
        var student = access.requireSelf();
        if (!student.getClassroom().getId().equals(quiz.getClassroom().getId())) {
            throw new AccessDeniedException("Ce quiz ne concerne pas votre classe");
        }
        if (quiz.getDueDate().isBefore(LocalDate.now(clock))) {
            throw new ConflictException("error.quiz.closed");
        }
        if (attempts.findByQuizIdAndStudentId(id, student.getId()).isPresent()) {
            throw new ConflictException("error.quiz.alreadyAnswered");
        }
        var questions = quiz.getQuestions();
        if (answers.size() != questions.size()) {
            throw new ConflictException("error.quiz.incomplete");
        }
        for (var i = 0; i < answers.size(); i++) {
            if (answers.get(i) < 0 || answers.get(i) >= questions.get(i).getChoices().size()) {
                throw new ConflictException("error.quiz.invalidAnswer", i + 1);
            }
        }
        return AttemptView.from(attempts.save(new QuizAttempt(quiz, student, answers, clock.instant())));
    }

    @Transactional(readOnly = true)
    public List<AttemptResult> results(Long id) {
        find(id);
        return attempts.findByQuizIdOrderByScoreDesc(id).stream().map(AttemptResult::from).toList();
    }

    public void delete(Long id) {
        var quiz = find(id);
        var current = CurrentUser.get();
        if (current.role() == Role.TEACHER && !quiz.getTeacher().getId().equals(current.id())) {
            throw new AccessDeniedException("Seul l'auteur peut supprimer ce quiz");
        }
        quizzes.delete(quiz);
    }

    private Student targetStudent(Long studentId) {
        var current = CurrentUser.get();
        return switch (current.role()) {
            case STUDENT -> access.requireSelf();
            case PARENT -> {
                if (studentId == null) {
                    throw new AccessDeniedException("Paramètre studentId requis");
                }
                yield access.requireReadable(studentId);
            }
            default -> studentId == null ? null : access.requireReadable(studentId);
        };
    }

    private QuizSummary summary(Quiz q, Object[] stats, QuizAttempt mine) {
        return new QuizSummary(q.getId(), q.getClassroom().getId(), q.getClassroom().getName(), q.getTeacher().getId(),
                q.getTeacher().fullName(), q.getSubject(), q.getTitle(), q.getDueDate(), quizzes.questionCount(q.getId()),
                stats == null ? 0 : (Long) stats[1], stats == null ? null : (Double) stats[2],
                mine == null ? null : AttemptView.from(mine));
    }

    private Quiz find(Long id) {
        return quizzes.findById(id).orElseThrow(() -> new NotFoundException("quiz", id));
    }
}
