package ma.madrasti.report;

import ma.madrasti.grade.GradeRepository;
import org.springframework.stereotype.Component;

import java.util.*;

/** Moyennes d'une classe sur un trimestre : par élève et par matière, puis générale et rang. */
@Component
public class ClassAverages {

    public record StudentAverages(Map<String, Double> subjects, Map<String, Long> gradeCounts, double overall, int rank) {
    }

    private final GradeRepository grades;

    public ClassAverages(GradeRepository grades) {
        this.grades = grades;
    }

    /** Élève → moyennes ; les élèves sans note ce trimestre sont absents de la carte. */
    public Map<Long, StudentAverages> compute(Long classroomId, String term) {
        Map<Long, Map<String, Double>> subjects = new HashMap<>();
        Map<Long, Map<String, Long>> counts = new HashMap<>();
        for (var row : grades.subjectAveragesForClass(classroomId, term)) {
            var id = (Long) row[0];
            subjects.computeIfAbsent(id, k -> new TreeMap<>()).put((String) row[1], ((Number) row[2]).doubleValue());
            counts.computeIfAbsent(id, k -> new HashMap<>()).put((String) row[1], (Long) row[3]);
        }
        Map<Long, Double> overall = new HashMap<>();
        subjects.forEach((id, s) -> overall.put(id, s.values().stream().mapToDouble(Double::doubleValue).average().orElse(0)));

        Map<Long, StudentAverages> result = new LinkedHashMap<>();
        overall.forEach((id, value) -> result.put(id, new StudentAverages(subjects.get(id), counts.get(id), value,
                (int) overall.values().stream().filter(v -> v > value).count() + 1)));
        return result;
    }

    /** Valeurs d'une matière pour toute la classe (moyenne, min, max). */
    public static DoubleSummaryStatistics subjectStats(Map<Long, StudentAverages> averages, String subject) {
        return averages.values().stream().map(a -> a.subjects().get(subject)).filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue).summaryStatistics();
    }

    public static OptionalDouble classAverage(Map<Long, StudentAverages> averages) {
        return averages.values().stream().mapToDouble(StudentAverages::overall).average();
    }
}
