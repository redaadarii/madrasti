package ma.madrasti.school;

import ma.madrasti.common.NotFoundException;
import ma.madrasti.school.SchoolDtos.ClassroomRequest;
import ma.madrasti.school.SchoolDtos.ClassroomResponse;
import ma.madrasti.school.SchoolDtos.SchoolRequest;
import ma.madrasti.school.SchoolDtos.SchoolResponse;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class SchoolService {

    private final SchoolRepository schools;
    private final ClassroomRepository classrooms;
    private final UserRepository users;

    public SchoolService(SchoolRepository schools, ClassroomRepository classrooms, UserRepository users) {
        this.schools = schools;
        this.classrooms = classrooms;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<SchoolResponse> schools() {
        return schools.findAll(Sort.by("name")).stream().map(SchoolResponse::from).toList();
    }

    public SchoolResponse createSchool(SchoolRequest request) {
        var school = new School(request.name(), request.city());
        apply(school, request);
        return SchoolResponse.from(schools.save(school));
    }

    public SchoolResponse updateSchool(Long id, SchoolRequest request) {
        var school = schools.findById(id).orElseThrow(() -> new NotFoundException("school", id));
        apply(school, request);
        return SchoolResponse.from(school);
    }

    public void deleteSchool(Long id) {
        schools.deleteById(id);
    }

    @Transactional(readOnly = true)
    public List<ClassroomResponse> classrooms() {
        Map<Long, Long> counts = classrooms.countStudentsPerClassroom().stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        return classrooms.findAllDetailed().stream()
                .map(c -> ClassroomResponse.from(c, counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    public ClassroomResponse createClassroom(ClassroomRequest request) {
        var classroom = new Classroom(school(request.schoolId()), request.name(), request.level(), request.academicYear());
        classroom.setMainTeacher(teacher(request.mainTeacherId()));
        return ClassroomResponse.from(classrooms.save(classroom), 0);
    }

    public ClassroomResponse updateClassroom(Long id, ClassroomRequest request) {
        var classroom = classrooms.findById(id).orElseThrow(() -> new NotFoundException("classroom", id));
        classroom.setSchool(school(request.schoolId()));
        classroom.setName(request.name());
        classroom.setLevel(request.level());
        classroom.setAcademicYear(request.academicYear());
        classroom.setMainTeacher(teacher(request.mainTeacherId()));
        return ClassroomResponse.from(classroom, 0);
    }

    public void deleteClassroom(Long id) {
        classrooms.deleteById(id);
    }

    private void apply(School school, SchoolRequest request) {
        school.setName(request.name());
        school.setCity(request.city());
        school.setAddress(request.address());
        school.setPhone(request.phone());
        school.setEmail(request.email());
    }

    private School school(Long id) {
        return schools.findById(id).orElseThrow(() -> new NotFoundException("school", id));
    }

    private User teacher(Long id) {
        if (id == null) {
            return null;
        }
        return users.findById(id).filter(u -> u.getRole() == Role.TEACHER)
                .orElseThrow(() -> new NotFoundException("teacher", id));
    }
}
