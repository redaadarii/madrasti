package ma.madrasti.student;

import jakarta.validation.Valid;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.PageResponse;
import ma.madrasti.student.StudentDtos.StudentRequest;
import ma.madrasti.student.StudentDtos.StudentResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService studentService;

    public StudentController(StudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public PageResponse<StudentResponse> search(@RequestParam(required = false) String q,
                                                @RequestParam(required = false) Long classroomId,
                                                @PageableDefault(size = 20, sort = "lastName", direction = Sort.Direction.ASC) Pageable pageable) {
        return studentService.search(q, classroomId, pageable);
    }

    @GetMapping("/mine")
    @PreAuthorize("hasRole('PARENT')")
    public List<StudentResponse> mine() {
        return studentService.childrenOf(CurrentUser.get().id());
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('STUDENT')")
    public StudentResponse me() {
        return studentService.me();
    }

    @GetMapping("/{id}")
    public StudentResponse get(@PathVariable Long id) {
        return studentService.get(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public StudentResponse create(@Valid @RequestBody StudentRequest request) {
        return studentService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public StudentResponse update(@PathVariable Long id, @Valid @RequestBody StudentRequest request) {
        return studentService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public void delete(@PathVariable Long id) {
        studentService.delete(id);
    }
}
