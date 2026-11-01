package ma.madrasti.config;

import ma.madrasti.announcement.Announcement;
import ma.madrasti.announcement.AnnouncementRepository;
import ma.madrasti.announcement.Audience;
import ma.madrasti.attendance.Absence;
import ma.madrasti.attendance.AbsenceKind;
import ma.madrasti.attendance.AbsenceRepository;
import ma.madrasti.finance.Payment;
import ma.madrasti.finance.PaymentMethod;
import ma.madrasti.finance.PaymentRepository;
import ma.madrasti.grade.Grade;
import ma.madrasti.grade.GradeRepository;
import ma.madrasti.homework.Assignment;
import ma.madrasti.homework.AssignmentRepository;
import ma.madrasti.homework.Submission;
import ma.madrasti.homework.SubmissionRepository;
import ma.madrasti.live.LiveProvider;
import ma.madrasti.live.LiveSession;
import ma.madrasti.live.LiveSessionRepository;
import ma.madrasti.school.Classroom;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.school.School;
import ma.madrasti.school.SchoolRepository;
import ma.madrasti.student.Student;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.Clock;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.random.RandomGenerator;

/** Jeu de données de démonstration, injecté uniquement sur une base vide. */
@Component
@Order(1)
@ConditionalOnBooleanProperty("madrasti.seed-demo-data")
public class DemoDataSeeder implements ApplicationRunner {

    public static final String DEMO_PASSWORD = "Madrasti2026!";
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final UserRepository users;
    private final SchoolRepository schools;
    private final ClassroomRepository classrooms;
    private final StudentRepository students;
    private final GradeRepository grades;
    private final AbsenceRepository absences;
    private final PaymentRepository payments;
    private final AnnouncementRepository announcements;
    private final AssignmentRepository assignments;
    private final SubmissionRepository submissions;
    private final LiveSessionRepository liveSessions;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;
    private final String jitsiBaseUrl;
    private final SeedLock seedLock;

    public DemoDataSeeder(UserRepository users, SchoolRepository schools, ClassroomRepository classrooms,
                          StudentRepository students, GradeRepository grades, AbsenceRepository absences,
                          PaymentRepository payments, AnnouncementRepository announcements,
                          AssignmentRepository assignments, SubmissionRepository submissions,
                          LiveSessionRepository liveSessions, PasswordEncoder passwordEncoder, Clock clock,
                          MadrastiProperties properties, SeedLock seedLock) {
        this.seedLock = seedLock;
        this.users = users;
        this.schools = schools;
        this.classrooms = classrooms;
        this.students = students;
        this.grades = grades;
        this.absences = absences;
        this.payments = payments;
        this.announcements = announcements;
        this.assignments = assignments;
        this.submissions = submissions;
        this.liveSessions = liveSessions;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
        this.jitsiBaseUrl = properties.live().jitsiBaseUrl();
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedLock.acquire();
        var hash = passwordEncoder.encode(DEMO_PASSWORD);
        if (users.count() == 0) {
            seedSchoolLife(hash);
        }
        // Ajouté après coup : complète aussi une base déjà initialisée par une version précédente.
        if (users.countByRole(Role.STUDENT) == 0) {
            seedStudentSpace(hash);
        }
    }

    private void seedSchoolLife(String hash) {
        var random = RandomGenerator.of("L64X128MixRandom");

        var school = new School("Groupe Scolaire Les Orangers", "Casablanca");
        school.setAddress("12, boulevard d'Anfa");
        school.setPhone("+212 522 00 00 00");
        school.setEmail("contact@lesorangers.ma");
        schools.save(school);

        var admin = user("admin@madrasti.ma", hash, "Salma", "Benali", Role.ADMIN, null);
        var director = user("direction@madrasti.ma", hash, "Karim", "El Idrissi", Role.DIRECTOR, school);
        var teachers = List.of(
                user("prof.math@madrasti.ma", hash, "Nadia", "Alaoui", Role.TEACHER, school),
                user("prof.francais@madrasti.ma", hash, "Youssef", "Tazi", Role.TEACHER, school),
                user("prof.sciences@madrasti.ma", hash, "Imane", "Chraibi", Role.TEACHER, school));

        var classes = List.of(
                classroom(school, "CE2-A", "Primaire", teachers.get(0)),
                classroom(school, "CM1-B", "Primaire", teachers.get(1)),
                classroom(school, "1AC-1", "Collège", teachers.get(2)));

        String[][] families = {
                {"Adari", "Adam", "Nellia"}, {"Berrada", "Rayan", "Yasmine"}, {"Cherkaoui", "Ilyas", "Sara"},
                {"Daoudi", "Mehdi", "Aya"}, {"Fassi", "Omar", "Hiba"}, {"Guessous", "Ali", "Nour"}};
        String[] subjects = {"Mathématiques", "Français", "Sciences", "Arabe", "Anglais"};
        var allStudents = new ArrayList<Student>();
        var index = 0;
        for (String[] family : families) {
            var parent = user("parent." + family[0].toLowerCase() + "@madrasti.ma", hash, "Famille", family[0],
                    Role.PARENT, school);
            for (int i = 1; i < family.length; i++) {
                var student = new Student("SC-2026-%04d".formatted(++index), family[i], family[0],
                        classes.get(index % classes.size()));
                student.setBirthDate(LocalDate.of(2014 + index % 4, 1 + index % 12, 1 + index % 27));
                student.setParent(parent);
                allStudents.add(students.save(student));
            }
        }

        var today = LocalDate.now(clock);
        for (var student : allStudents) {
            for (var subject : subjects) {
                var score = BigDecimal.valueOf(8 + random.nextInt(0, 12) + random.nextInt(0, 4) * 0.25);
                grades.save(new Grade(student, subject, "Contrôle continu 1", score, BigDecimal.valueOf(20), "T1"));
            }
            if (random.nextInt(3) == 0) {
                var absence = absences.save(new Absence(student, today.minusDays(random.nextInt(1, 25)),
                        random.nextBoolean() ? AbsenceKind.ABSENCE : AbsenceKind.LATE, null));
                if (random.nextBoolean()) {
                    absence.justify("Certificat médical");
                }
            }
            var september = payments.save(new Payment(student, "Frais de scolarité — Septembre",
                    BigDecimal.valueOf(2500), LocalDate.of(today.getYear(), 9, 5)));
            september.markPaid(LocalDate.of(today.getYear(), 9, 3), PaymentMethod.TRANSFER);
            payments.save(new Payment(student, "Frais de scolarité — Octobre", BigDecimal.valueOf(2500),
                    LocalDate.of(today.getYear(), 10, 5)));
            payments.save(new Payment(student, "Transport — Trimestre 1", BigDecimal.valueOf(900),
                    today.plusDays(15)));
        }

        announcements.save(new Announcement("Bienvenue sur Madrasti",
                "Toute la vie de l'école réunie au même endroit : notes, absences, paiements et actualités.",
                Audience.ALL, true, admin));
        announcements.save(new Announcement("Réunion parents-professeurs",
                "La réunion du premier trimestre aura lieu le samedi à 10h dans l'amphithéâtre.",
                Audience.PARENTS, false, director));
        announcements.save(new Announcement("Conseil de classe",
                "Merci de saisir toutes les notes du T1 avant vendredi.", Audience.TEACHERS, false, director));

        log.info("Données de démonstration créées — connexion : admin@madrasti.ma / {}", DEMO_PASSWORD);
    }

    /** Comptes élèves (prenom.nom@eleve.madrasti.ma), devoirs et cours en direct pour chaque classe. */
    private void seedStudentSpace(String hash) {
        var now = clock.instant();
        var today = LocalDate.now(clock);
        for (var student : students.findByAccountIsNull()) {
            var email = slug(student.getFirstName()) + "." + slug(student.getLastName()) + "@eleve.madrasti.ma";
            var account = user(email, hash, student.getFirstName(), student.getLastName(), Role.STUDENT,
                    student.getClassroom().getSchool());
            student.setAccount(account);
        }

        for (var classroom : classrooms.findAllDetailed()) {
            var teacher = classroom.getMainTeacher() != null ? classroom.getMainTeacher()
                    : users.findAll().stream().filter(u -> u.getRole() == Role.TEACHER).findFirst().orElseThrow();
            var reading = assignments.save(new Assignment(classroom, teacher, "Français", "Lecture : Le Petit Prince",
                    "Lire le chapitre 3 et répondre en quelques lignes : que nous apprend la rencontre avec le renard ?",
                    today.plusDays(3)));
            var fractions = assignments.save(new Assignment(classroom, teacher, "Mathématiques", "Exercices sur les fractions",
                    "Exercices 4, 5 et 7 page 52. Détaillez chaque étape du calcul.", today.plusDays(1)));
            assignments.save(new Assignment(classroom, teacher, "Sciences", "Exposé : le cycle de l'eau",
                    "Préparez un court exposé illustré (schéma + 10 lignes) sur le cycle de l'eau.", today.plusDays(7)));

            var classStudents = students.search(null, classroom.getId(),
                    org.springframework.data.domain.PageRequest.of(0, 100)).getContent();
            if (!classStudents.isEmpty()) {
                var first = new Submission(fractions, classStudents.getFirst());
                first.submit("Ex. 4 : 3/4 + 1/8 = 7/8\nEx. 5 : 2/3 × 3/5 = 2/5\nEx. 7 : 5/6 − 1/3 = 1/2", now.minus(Duration.ofHours(5)));
                first.review(BigDecimal.valueOf(17), "Très bon travail, calculs clairs. Attention à simplifier dès le départ.");
                submissions.save(first);
            }
            if (classStudents.size() > 1) {
                var second = new Submission(reading, classStudents.get(1));
                second.submit("Le renard apprend au petit prince que l'on ne voit bien qu'avec le cœur.", now.minus(Duration.ofHours(2)));
                submissions.save(second);
            }

            liveSessions.save(new LiveSession(classroom, teacher, "Mathématiques", "Révisions — fractions",
                    now.truncatedTo(ChronoUnit.MINUTES).minus(Duration.ofMinutes(5)), 60, LiveProvider.JITSI,
                    jitsiBaseUrl + "/Madrasti-" + slug(classroom.getName()) + "-revisions-" + classroom.getId()));
            liveSessions.save(new LiveSession(classroom, teacher, "Français", "Atelier lecture à voix haute",
                    now.plus(Duration.ofDays(1)).truncatedTo(ChronoUnit.HOURS), 45, LiveProvider.JITSI,
                    jitsiBaseUrl + "/Madrasti-" + slug(classroom.getName()) + "-lecture-" + classroom.getId()));
        }
        log.info("Espace élève créé — connexion : adam.adari@eleve.madrasti.ma / {}", DEMO_PASSWORD);
    }

    private static String slug(String value) {
        return Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("[^A-Za-z0-9]", "").toLowerCase();
    }

    private User user(String email, String hash, String firstName, String lastName, Role role, School school) {
        var user = new User(email, hash, firstName, lastName, role);
        user.setSchool(school);
        return users.save(user);
    }

    private Classroom classroom(School school, String name, String level, User teacher) {
        var classroom = new Classroom(school, name, level, "2026-2027");
        classroom.setMainTeacher(teacher);
        return classrooms.save(classroom);
    }
}
