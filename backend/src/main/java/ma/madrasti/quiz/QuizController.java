package ma.madrasti.quiz;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import ma.madrasti.quiz.QuizService.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Exercices interactifs : QCM en ligne avec correction instantanée. */
@RestController
@RequestMapping("/api/quizzes")
public class QuizController {

    public record AttemptRequest(@NotEmpty List<Integer> answers) {
    }

    private final QuizService quizzes;

    public QuizController(QuizService quizzes) {
        this.quizzes = quizzes;
    }

    @GetMapping
    public List<QuizSummary> list(@RequestParam(required = false) Long classroomId,
                                  @RequestParam(required = false) Long studentId) {
        return quizzes.list(classroomId, studentId);
    }

    @GetMapping("/{id}")
    public QuizDetail get(@PathVariable Long id) {
        return quizzes.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public QuizSummary create(@Valid @RequestBody QuizRequest request) {
        return quizzes.create(request);
    }

    @PostMapping("/{id}/attempts")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('STUDENT')")
    public AttemptView attempt(@PathVariable Long id, @Valid @RequestBody AttemptRequest request) {
        return quizzes.attempt(id, request.answers());
    }

    @GetMapping("/{id}/attempts")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public List<AttemptResult> results(@PathVariable Long id) {
        return quizzes.results(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        quizzes.delete(id);
    }
}
