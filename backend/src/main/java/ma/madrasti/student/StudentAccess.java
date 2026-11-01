package ma.madrasti.student;

import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/** Règle d'accès aux données d'un élève : le personnel de l'école ou le parent rattaché. */
@Component
public class StudentAccess {

    private final StudentRepository students;

    public StudentAccess(StudentRepository students) {
        this.students = students;
    }

    public Student requireReadable(Long studentId) {
        var student = students.findById(studentId).orElseThrow(() -> new NotFoundException("student", studentId));
        var current = CurrentUser.get();
        var isParent = student.getParent() != null && student.getParent().getId().equals(current.id());
        var isSelf = student.getAccount() != null && student.getAccount().getId().equals(current.id());
        if (!current.isStaff() && !isParent && !isSelf) {
            throw new AccessDeniedException("Accès refusé à cet élève");
        }
        return student;
    }

    /** Fiche de l'élève connecté (rôle STUDENT). */
    public Student requireSelf() {
        var current = CurrentUser.get();
        return students.findByAccountId(current.id())
                .orElseThrow(() -> new NotFoundException("studentProfile", current.id()));
    }

    /** Classes visibles par l'appelant : toutes (null) pour le personnel, sinon celles de l'élève ou des enfants. */
    public java.util.Set<Long> visibleClassroomIds() {
        var current = CurrentUser.get();
        return switch (current.role()) {
            case ADMIN, DIRECTOR, TEACHER -> null;
            case STUDENT -> java.util.Set.of(requireSelf().getClassroom().getId());
            case PARENT -> students.findByParentIdOrderByFirstName(current.id()).stream()
                    .map(s -> s.getClassroom().getId()).collect(java.util.stream.Collectors.toSet());
        };
    }
}
