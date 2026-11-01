package ma.madrasti.school;

import jakarta.validation.Valid;
import ma.madrasti.school.SchoolDtos.ClassroomRequest;
import ma.madrasti.school.SchoolDtos.ClassroomResponse;
import ma.madrasti.school.SchoolDtos.SchoolRequest;
import ma.madrasti.school.SchoolDtos.SchoolResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SchoolController {

    private final SchoolService schoolService;

    public SchoolController(SchoolService schoolService) {
        this.schoolService = schoolService;
    }

    @GetMapping("/schools")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public List<SchoolResponse> schools() {
        return schoolService.schools();
    }

    @PostMapping("/schools")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('ADMIN')")
    public SchoolResponse createSchool(@Valid @RequestBody SchoolRequest request) {
        return schoolService.createSchool(request);
    }

    @PutMapping("/schools/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public SchoolResponse updateSchool(@PathVariable Long id, @Valid @RequestBody SchoolRequest request) {
        return schoolService.updateSchool(id, request);
    }

    @DeleteMapping("/schools/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasRole('ADMIN')")
    public void deleteSchool(@PathVariable Long id) {
        schoolService.deleteSchool(id);
    }

    @GetMapping("/classrooms")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public List<ClassroomResponse> classrooms() {
        return schoolService.classrooms();
    }

    @PostMapping("/classrooms")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public ClassroomResponse createClassroom(@Valid @RequestBody ClassroomRequest request) {
        return schoolService.createClassroom(request);
    }

    @PutMapping("/classrooms/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public ClassroomResponse updateClassroom(@PathVariable Long id, @Valid @RequestBody ClassroomRequest request) {
        return schoolService.updateClassroom(id, request);
    }

    @DeleteMapping("/classrooms/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public void deleteClassroom(@PathVariable Long id) {
        schoolService.deleteClassroom(id);
    }
}
