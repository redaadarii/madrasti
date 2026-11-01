package ma.madrasti.report;

import ma.madrasti.attendance.AbsenceKind;
import ma.madrasti.attendance.AbsenceRepository;
import ma.madrasti.council.CouncilDecisionRepository;
import ma.madrasti.student.StudentAccess;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/** Bulletin trimestriel calculé à la volée : moyennes par matière, moyennes de classe, rang et assiduité. */
@RestController
@RequestMapping("/api/students/{studentId}/report-card")
public class ReportCardController {

    public record SubjectLine(String subject, BigDecimal average, BigDecimal classAverage, BigDecimal min,
                              BigDecimal max, long gradeCount) {
    }

    public record ReportCard(Long studentId, String studentName, String registrationNumber, String classroomName,
                             String schoolName, String term, List<SubjectLine> subjects, BigDecimal overallAverage,
                             BigDecimal classAverage, Integer rank, int classSize, String mention,
                             long absences, long lates, long unjustified, String councilDecision,
                             String councilAppreciation) {
    }

    private final ClassAverages averages;
    private final AbsenceRepository absences;
    private final StudentAccess access;
    private final MessageSource messages;
    private final CouncilDecisionRepository decisions;

    public ReportCardController(ClassAverages averages, AbsenceRepository absences, StudentAccess access,
                                MessageSource messages, CouncilDecisionRepository decisions) {
        this.averages = averages;
        this.absences = absences;
        this.access = access;
        this.messages = messages;
        this.decisions = decisions;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ReportCard reportCard(@PathVariable Long studentId, @RequestParam(defaultValue = "T1") String term) {
        var student = access.requireReadable(studentId);
        var computed = averages.compute(student.getClassroom().getId(), term);
        var mine = computed.get(studentId);
        var lines = mine == null ? List.<SubjectLine>of() : mine.subjects().entrySet().stream().map(entry -> {
            var stats = ClassAverages.subjectStats(computed, entry.getKey());
            return new SubjectLine(entry.getKey(), round(entry.getValue()), round(stats.getAverage()), round(stats.getMin()),
                    round(stats.getMax()), mine.gradeCounts().getOrDefault(entry.getKey(), 0L));
        }).toList();
        var classAverage = ClassAverages.classAverage(computed);
        var locale = LocaleContextHolder.getLocale();
        var council = decisions.findByStudentIdAndTerm(studentId, term).orElse(null);

        var history = absences.findByStudentIdOrderByDayDesc(studentId);
        var lates = history.stream().filter(a -> a.getKind() == AbsenceKind.LATE).count();
        return new ReportCard(student.getId(), student.fullName(), student.getRegistrationNumber(),
                student.getClassroom().getName(), student.getClassroom().getSchool().getName(), term, lines,
                mine == null ? null : round(mine.overall()),
                classAverage.isPresent() ? round(classAverage.getAsDouble()) : null, mine == null ? null : mine.rank(),
                computed.size(), mine == null ? null : messages.getMessage(mention(mine.overall()), null, locale),
                history.size() - lates, lates, history.stream().filter(a -> !a.isJustified()).count(),
                council == null ? null : messages.getMessage("council." + council.getDecision().name(), null, locale),
                council == null ? null : council.getAppreciation());
    }

    /** Clé de la mention (traduite dans messages*.properties). */
    static String mention(double average) {
        if (average >= 16) return "report.mention.excellent";
        if (average >= 14) return "report.mention.good";
        if (average >= 12) return "report.mention.fair";
        if (average >= 10) return "report.mention.pass";
        return "report.mention.weak";
    }

    private static BigDecimal round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
