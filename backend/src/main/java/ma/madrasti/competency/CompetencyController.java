package ma.madrasti.competency;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Livret de compétences : un référentiel par matière, évalué sur une échelle à quatre niveaux par trimestre.
 * Complète le bulletin chiffré (primaire notamment, où l'évaluation par compétences est la norme).
 */
@RestController
@RequestMapping("/api/competencies")
@Transactional
public class CompetencyController {

    public record CompetencyRequest(@NotBlank @Size(max = 60) String subject, @NotBlank @Size(max = 200) String label,
                                    @Size(max = 40) String level) {
    }

    public record AssessmentRequest(@NotNull Long studentId, @NotNull Long competencyId,
                                    @NotBlank @Pattern(regexp = "T[1-3]") String term, Mastery mastery) {
    }

    public record CompetencyView(Long id, String subject, String label, String level) {
        static CompetencyView from(Competency c) {
            return new CompetencyView(c.getId(), c.getSubject(), c.getLabel(), c.getLevel());
        }
    }

    public record StudentRow(Long studentId, String studentName, Map<Long, Mastery> levels) {
    }

    public record ClassroomGrid(List<CompetencyView> competencies, List<StudentRow> students) {
    }

    public record AssessedCompetency(Long id, String label, Mastery mastery) {
    }

    public record SubjectBlock(String subject, List<AssessedCompetency> competencies) {
    }

    private final CompetencyRepository competencies;
    private final CompetencyAssessmentRepository assessments;
    private final StudentRepository students;
    private final ClassroomRepository classrooms;
    private final StudentAccess access;
    private final UserRepository users;

    public CompetencyController(CompetencyRepository competencies, CompetencyAssessmentRepository assessments,
                                StudentRepository students, ClassroomRepository classrooms, StudentAccess access,
                                UserRepository users) {
        this.competencies = competencies;
        this.assessments = assessments;
        this.students = students;
        this.classrooms = classrooms;
        this.access = access;
        this.users = users;
    }

    @GetMapping
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public List<CompetencyView> list() {
        return competencies.findAllByOrderBySubjectAscIdAsc().stream().map(CompetencyView::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public CompetencyView create(@Valid @RequestBody CompetencyRequest request) {
        var level = request.level() == null || request.level().isBlank() ? null : request.level().strip();
        return CompetencyView.from(competencies.save(new Competency(request.subject().strip(), request.label().strip(), level)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public void delete(@PathVariable Long id) {
        competencies.delete(competencies.findById(id).orElseThrow(() -> new NotFoundException("competency", id)));
    }

    /** Grille de saisie : élèves de la classe × compétences du niveau de la classe. */
    @GetMapping("/classrooms/{classroomId}")
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public ClassroomGrid grid(@PathVariable Long classroomId, @RequestParam(defaultValue = "T1") String term) {
        var classroom = classrooms.findById(classroomId).orElseThrow(() -> new NotFoundException("classroom", classroomId));
        var applicable = competencies.findAllByOrderBySubjectAscIdAsc().stream()
                .filter(c -> c.appliesTo(classroom.getLevel())).map(CompetencyView::from).toList();
        var byStudent = assessments.findByStudentClassroomIdAndTerm(classroomId, term).stream()
                .collect(Collectors.groupingBy(a -> a.getStudent().getId(),
                        Collectors.toMap(a -> a.getCompetency().getId(), CompetencyAssessment::getMastery)));
        var rows = students.findByClassroomId(classroomId).stream()
                .sorted(Comparator.comparing(s -> s.getLastName() + " " + s.getFirstName()))
                .map(s -> new StudentRow(s.getId(), s.fullName(), byStudent.getOrDefault(s.getId(), Map.of())))
                .toList();
        return new ClassroomGrid(applicable, rows);
    }

    /** Enregistre (ou efface, si {@code mastery} est absent) le niveau d'un élève pour une compétence. */
    @PutMapping("/assessments")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void assess(@Valid @RequestBody AssessmentRequest request) {
        var existing = assessments.findByStudentIdAndCompetencyIdAndTerm(request.studentId(), request.competencyId(), request.term());
        if (request.mastery() == null) {
            existing.ifPresent(assessments::delete);
            return;
        }
        var assessment = existing.orElseGet(() -> new CompetencyAssessment(
                students.findById(request.studentId()).orElseThrow(() -> new NotFoundException("student", request.studentId())),
                competencies.findById(request.competencyId()).orElseThrow(() -> new NotFoundException("competency", request.competencyId())),
                request.term()));
        assessment.assess(request.mastery(), users.getReferenceById(CurrentUser.get().id()));
        assessments.save(assessment);
    }

    /** Livret d'un élève (famille, élève, personnel), regroupé par matière. */
    @GetMapping("/students/{studentId}")
    @Transactional(readOnly = true)
    public List<SubjectBlock> forStudent(@PathVariable Long studentId, @RequestParam(defaultValue = "T1") String term) {
        access.requireReadable(studentId);
        var bySubject = new TreeMap<String, List<AssessedCompetency>>();
        assessments.findByStudentIdAndTerm(studentId, term).stream()
                .sorted(Comparator.comparing(a -> a.getCompetency().getId()))
                .forEach(a -> bySubject.computeIfAbsent(a.getCompetency().getSubject(), k -> new ArrayList<>())
                        .add(new AssessedCompetency(a.getCompetency().getId(), a.getCompetency().getLabel(), a.getMastery())));
        return bySubject.entrySet().stream().map(e -> new SubjectBlock(e.getKey(), e.getValue())).toList();
    }
}
