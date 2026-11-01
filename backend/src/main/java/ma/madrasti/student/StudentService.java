package ma.madrasti.student;

import ma.madrasti.audit.AuditAction;
import ma.madrasti.audit.AuditService;

import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.common.PageResponse;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.StudentDtos.StudentRequest;
import ma.madrasti.student.StudentDtos.StudentResponse;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
@Transactional
public class StudentService {

    private final StudentRepository students;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final StudentAccess access;

    private final AuditService audit;

    public StudentService(StudentRepository students, ClassroomRepository classrooms, UserRepository users,
                          StudentAccess access, AuditService audit) {
        this.audit = audit;
        this.students = students;
        this.classrooms = classrooms;
        this.users = users;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public PageResponse<StudentResponse> search(String q, Long classroomId, Pageable pageable) {
        var query = StringUtils.hasText(q) ? q.trim() : null;
        return PageResponse.of(students.search(query, classroomId, pageable), StudentResponse::from);
    }

    @Transactional(readOnly = true)
    public List<StudentResponse> childrenOf(Long parentId) {
        return students.findByParentIdOrderByFirstName(parentId).stream().map(StudentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public StudentResponse get(Long id) {
        return StudentResponse.from(access.requireReadable(id));
    }

    public StudentResponse create(StudentRequest request) {
        if (students.existsByRegistrationNumber(request.registrationNumber())) {
            throw new ConflictException("error.registrationNumber.taken");
        }
        var student = new Student(request.registrationNumber(), request.firstName(), request.lastName(),
                classroom(request.classroomId()));
        student.setBirthDate(request.birthDate());
        student.setMassarCode(request.massarCode() == null || request.massarCode().isBlank() ? null : request.massarCode());
        student.setParent(parent(request.parentId()));
        student.setAccount(account(request.accountId()));
        return StudentResponse.from(students.save(student));
    }

    public StudentResponse update(Long id, StudentRequest request) {
        var student = students.findById(id).orElseThrow(() -> new NotFoundException("student", id));
        student.setRegistrationNumber(request.registrationNumber());
        student.setFirstName(request.firstName());
        student.setLastName(request.lastName());
        student.setBirthDate(request.birthDate());
        student.setMassarCode(request.massarCode() == null || request.massarCode().isBlank() ? null : request.massarCode());
        student.setClassroom(classroom(request.classroomId()));
        student.setParent(parent(request.parentId()));
        student.setAccount(account(request.accountId()));
        return StudentResponse.from(student);
    }

    public void delete(Long id) {
        var student = students.findById(id).orElseThrow(() -> new NotFoundException("student", id));
        students.delete(student);
        audit.record(AuditAction.STUDENT_DELETED, student.fullName() + " (" + student.getRegistrationNumber() + ")", null);
    }

    private ma.madrasti.school.Classroom classroom(Long id) {
        return classrooms.findById(id).orElseThrow(() -> new NotFoundException("classroom", id));
    }

    @Transactional(readOnly = true)
    public StudentResponse me() {
        return StudentResponse.from(access.requireSelf());
    }

    private User account(Long id) {
        if (id == null) {
            return null;
        }
        return users.findById(id).filter(u -> u.getRole() == Role.STUDENT)
                .orElseThrow(() -> new NotFoundException("studentAccount", id));
    }

    private User parent(Long id) {
        if (id == null) {
            return null;
        }
        return users.findById(id).filter(u -> u.getRole() == Role.PARENT)
                .orElseThrow(() -> new NotFoundException("parent", id));
    }
}
