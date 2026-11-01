package ma.madrasti.council;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.madrasti.attendance.AbsenceRepository;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.report.ClassAverages;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.Student;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.Role;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Conseil de classe : vue d'ensemble d'une classe pour un trimestre et décisions par élève. */
@RestController
@RequestMapping("/api/councils")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
@Transactional
public class CouncilController {

    public record CouncilRow(Long studentId, String studentName, BigDecimal average, Integer rank, long absences,
                             CouncilDecision.Decision suggested, CouncilDecision.Decision decision, String appreciation) {
    }

    public record DecisionRequest(@NotNull Long studentId, @NotBlank String term, @NotNull CouncilDecision.Decision decision,
                                  @Size(max = 500) String appreciation) {
    }

    private final ClassAverages averages;
    private final StudentRepository students;
    private final ClassroomRepository classrooms;
    private final AbsenceRepository absences;
    private final CouncilDecisionRepository decisions;

    public CouncilController(ClassAverages averages, StudentRepository students, ClassroomRepository classrooms,
                             AbsenceRepository absences, CouncilDecisionRepository decisions) {
        this.averages = averages;
        this.students = students;
        this.classrooms = classrooms;
        this.absences = absences;
        this.decisions = decisions;
    }

    @GetMapping("/{classroomId}")
    @Transactional(readOnly = true)
    public List<CouncilRow> council(@PathVariable Long classroomId, @RequestParam(defaultValue = "T1") String term) {
        var computed = averages.compute(classroomId, term);
        Map<Long, CouncilDecision> recorded = decisions.findByStudentClassroomIdAndTerm(classroomId, term).stream()
                .collect(Collectors.toMap(d -> d.getStudent().getId(), Function.identity()));
        return students.findByClassroomId(classroomId).stream().map(student -> {
            var avg = computed.get(student.getId());
            var decision = recorded.get(student.getId());
            return new CouncilRow(student.getId(), student.fullName(),
                    avg == null ? null : BigDecimal.valueOf(avg.overall()).setScale(2, RoundingMode.HALF_UP),
                    avg == null ? null : avg.rank(), absences.findByStudentIdOrderByDayDesc(student.getId()).size(),
                    avg == null ? null : CouncilDecision.suggest(avg.overall()),
                    decision == null ? null : decision.getDecision(), decision == null ? null : decision.getAppreciation());
        }).sorted(Comparator.comparing(CouncilRow::rank, Comparator.nullsLast(Comparator.naturalOrder()))).toList();
    }

    /** Direction, ou professeur principal de la classe. */
    @PutMapping("/decisions")
    public void decide(@Valid @RequestBody DecisionRequest request) {
        Student student = students.findById(request.studentId())
                .orElseThrow(() -> new NotFoundException("student", request.studentId()));
        var current = CurrentUser.get();
        var mainTeacher = student.getClassroom().getMainTeacher();
        if (current.role() == Role.TEACHER && (mainTeacher == null || !mainTeacher.getId().equals(current.id()))) {
            throw new AccessDeniedException("main-teacher-only");
        }
        var decision = decisions.findByStudentIdAndTerm(student.getId(), request.term())
                .orElseGet(() -> new CouncilDecision(student, request.term()));
        decision.record(request.decision(), request.appreciation());
        decisions.save(decision);
    }
}
