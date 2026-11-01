package ma.madrasti.homework;

import jakarta.validation.Valid;
import ma.madrasti.homework.HomeworkDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Cahier de textes : devoirs publiés par les enseignants, rendus et corrigés en ligne. */
@RestController
@RequestMapping("/api")
public class HomeworkController {

    private final HomeworkService homework;

    public HomeworkController(HomeworkService homework) {
        this.homework = homework;
    }

    @GetMapping("/assignments")
    public List<AssignmentResponse> list(@RequestParam(required = false) Long classroomId,
                                         @RequestParam(required = false) Long studentId) {
        return homework.list(classroomId, studentId);
    }

    @PostMapping("/assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public AssignmentResponse create(@Valid @RequestBody AssignmentRequest request) {
        return homework.create(request);
    }

    @DeleteMapping("/assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        homework.delete(id);
    }

    @PutMapping("/assignments/{id}/submission")
    @PreAuthorize("hasRole('STUDENT')")
    public SubmissionResponse submit(@PathVariable Long id, @Valid @RequestBody SubmitRequest request) {
        return homework.submit(id, request.content());
    }

    @GetMapping("/assignments/{id}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public List<SubmissionResponse> submissions(@PathVariable Long id) {
        return homework.submissions(id);
    }

    @PutMapping("/submissions/{id}/review")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public SubmissionResponse review(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        return homework.review(id, request);
    }
}
