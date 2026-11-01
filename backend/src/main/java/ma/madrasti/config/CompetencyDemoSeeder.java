package ma.madrasti.config;

import ma.madrasti.competency.Competency;
import ma.madrasti.competency.CompetencyAssessment;
import ma.madrasti.competency.CompetencyAssessmentRepository;
import ma.madrasti.competency.CompetencyRepository;
import ma.madrasti.competency.Mastery;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** Données de démonstration : référentiel de compétences et livret du 1er trimestre. */
@Component
@Order(6)
@ConditionalOnBooleanProperty("madrasti.seed-demo-data")
public class CompetencyDemoSeeder implements ApplicationRunner {

    private final CompetencyRepository competencies;
    private final CompetencyAssessmentRepository assessments;
    private final StudentRepository students;
    private final UserRepository users;
    private final SeedLock seedLock;

    public CompetencyDemoSeeder(CompetencyRepository competencies, CompetencyAssessmentRepository assessments,
                                StudentRepository students, UserRepository users, SeedLock seedLock) {
        this.competencies = competencies;
        this.assessments = assessments;
        this.students = students;
        this.users = users;
        this.seedLock = seedLock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedLock.acquire();
        if (competencies.count() > 0 || students.count() == 0) {
            return;
        }
        var referential = competencies.saveAll(List.of(
                new Competency("Français", "Lire à voix haute un texte court avec fluidité", null),
                new Competency("Français", "Comprendre un texte et répondre à des questions", null),
                new Competency("Français", "Écrire un texte court en respectant l'orthographe", null),
                new Competency("Mathématiques", "Calculer avec les nombres entiers et décimaux", null),
                new Competency("Mathématiques", "Résoudre un problème en plusieurs étapes", null),
                new Competency("Mathématiques", "Reconnaître et tracer des figures géométriques", null),
                new Competency("Sciences", "Mener une observation et formuler une hypothèse", null),
                new Competency("Arabe", "Lire et comprendre un texte en arabe", null),
                new Competency("Vivre ensemble", "Respecter les règles de la vie collective", null),
                new Competency("Vivre ensemble", "Coopérer et s'entraider dans un travail de groupe", null)));
        var teacher = users.findByEmailIgnoreCase("prof.francais@madrasti.ma").orElse(null);
        var levels = Mastery.values();
        var index = 0;
        for (var student : students.findAll()) {
            for (var c = 0; c < referential.size(); c++) {
                // Répartition variée mais déterministe, majoritairement « acquis ».
                var score = (index * 7 + c * 3) % 10;
                var mastery = score < 1 ? levels[0] : score < 4 ? levels[1] : score < 8 ? levels[2] : levels[3];
                var assessment = new CompetencyAssessment(student, referential.get(c), "T1");
                assessment.assess(mastery, teacher);
                assessments.save(assessment);
            }
            index++;
        }
    }
}
