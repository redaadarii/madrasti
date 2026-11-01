package ma.madrasti.stats;

import ma.madrasti.attendance.AbsenceRepository;
import ma.madrasti.finance.PaymentRepository;
import ma.madrasti.grade.GradeRepository;
import ma.madrasti.student.StudentRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/** Statistiques pédagogiques et financières, et élèves à accompagner (remédiation ciblée). */
@RestController
@RequestMapping("/api/stats")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
public class StatsController {

    public record SubjectAverage(String subject, BigDecimal average) {
    }

    public record MonthValue(String month, BigDecimal value) {
    }

    public record Bucket(String range, long students) {
    }

    public record AtRisk(Long studentId, String studentName, String classroomName, String subject, BigDecimal average) {
    }

    public record Stats(List<SubjectAverage> subjects, List<Bucket> distribution, List<MonthValue> absences,
                        List<MonthValue> collections, List<AtRisk> atRisk) {
    }

    private static final double[] BOUNDS = {0, 8, 10, 12, 14, 16, 20.01};
    private static final int MONTHS = 6;
    private static final double RISK_THRESHOLD = 10;

    private final GradeRepository grades;
    private final AbsenceRepository absences;
    private final PaymentRepository payments;
    private final StudentRepository students;
    private final Clock clock;

    public StatsController(GradeRepository grades, AbsenceRepository absences, PaymentRepository payments,
                           StudentRepository students, Clock clock) {
        this.grades = grades;
        this.absences = absences;
        this.payments = payments;
        this.students = students;
        this.clock = clock;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Stats stats() {
        // élève → matière → moyenne sur 20 (tous trimestres)
        Map<Long, Map<String, Double>> perStudent = new HashMap<>();
        for (var row : grades.subjectAveragesPerStudent()) {
            perStudent.computeIfAbsent((Long) row[0], k -> new HashMap<>()).put((String) row[1], ((Number) row[2]).doubleValue());
        }

        Map<String, DoubleSummaryStatistics> bySubject = new TreeMap<>();
        perStudent.values().forEach(m -> m.forEach((s, v) -> bySubject.computeIfAbsent(s, k -> new DoubleSummaryStatistics()).accept(v)));
        var subjects = bySubject.entrySet().stream().map(e -> new SubjectAverage(e.getKey(), round(e.getValue().getAverage()))).toList();

        var overall = perStudent.values().stream().mapToDouble(m -> m.values().stream().mapToDouble(Double::doubleValue).average().orElse(0)).toArray();
        var distribution = new ArrayList<Bucket>();
        for (var i = 0; i < BOUNDS.length - 1; i++) {
            var lo = BOUNDS[i];
            var hi = BOUNDS[i + 1];
            distribution.add(new Bucket("%d–%d".formatted((int) lo, (int) Math.min(hi, 20)),
                    Arrays.stream(overall).filter(v -> v >= lo && v < hi).count()));
        }

        var today = LocalDate.now(clock);
        var start = YearMonth.from(today).minusMonths(MONTHS - 1);
        Map<YearMonth, BigDecimal> absenceCounts = new TreeMap<>();
        Map<YearMonth, BigDecimal> collected = new TreeMap<>();
        for (var i = 0; i < MONTHS; i++) {
            absenceCounts.put(start.plusMonths(i), BigDecimal.ZERO);
            collected.put(start.plusMonths(i), BigDecimal.ZERO);
        }
        for (var a : absences.findByDayGreaterThanEqual(start.atDay(1))) {
            absenceCounts.computeIfPresent(YearMonth.from(a.getDay()), (k, v) -> v.add(BigDecimal.ONE));
        }
        for (var p : payments.findByPaidAtBetween(start.atDay(1), today)) {
            collected.computeIfPresent(YearMonth.from(p.getPaidAt()), (k, v) -> v.add(p.getAmount()));
        }

        var names = new HashMap<Long, String[]>();
        students.findAllById(perStudent.keySet()).forEach(s -> names.put(s.getId(), new String[]{s.fullName(), s.getClassroom().getName()}));
        var atRisk = perStudent.entrySet().stream()
                .flatMap(e -> e.getValue().entrySet().stream().filter(s -> s.getValue() < RISK_THRESHOLD)
                        .map(s -> new AtRisk(e.getKey(), names.getOrDefault(e.getKey(), new String[]{"?", "?"})[0],
                                names.getOrDefault(e.getKey(), new String[]{"?", "?"})[1], s.getKey(), round(s.getValue()))))
                .sorted(Comparator.comparing(AtRisk::average))
                .limit(30)
                .toList();

        return new Stats(subjects, distribution, toMonths(absenceCounts), toMonths(collected), atRisk);
    }

    private static List<MonthValue> toMonths(Map<YearMonth, BigDecimal> values) {
        return values.entrySet().stream().map(e -> new MonthValue(e.getKey().toString(), e.getValue())).toList();
    }

    private static BigDecimal round(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
