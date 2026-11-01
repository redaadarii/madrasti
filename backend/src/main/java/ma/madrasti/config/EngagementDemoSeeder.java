package ma.madrasti.config;

import ma.madrasti.announcement.Audience;
import ma.madrasti.appointment.AppointmentSlot;
import ma.madrasti.appointment.AppointmentSlotRepository;
import ma.madrasti.attendance.AbsenceRepository;
import ma.madrasti.behavior.BehaviorRecord;
import ma.madrasti.behavior.BehaviorRecord.Category;
import ma.madrasti.behavior.BehaviorRecordRepository;
import ma.madrasti.poll.Poll;
import ma.madrasti.poll.PollRepository;
import ma.madrasti.poll.PollVote;
import ma.madrasti.poll.PollVoteRepository;
import ma.madrasti.school.ClassroomRepository;
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
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/** Données de démonstration : rendez-vous parents-professeurs, sondages, comportement, justificatif d'absence. */
@Component
@Order(4)
@ConditionalOnBooleanProperty("madrasti.seed-demo-data")
public class EngagementDemoSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(EngagementDemoSeeder.class);

    private final UserRepository users;
    private final StudentRepository students;
    private final ClassroomRepository classrooms;
    private final AppointmentSlotRepository slots;
    private final PollRepository polls;
    private final PollVoteRepository votes;
    private final BehaviorRecordRepository behavior;
    private final AbsenceRepository absences;
    private final Clock clock;
    private final SeedLock seedLock;

    public EngagementDemoSeeder(UserRepository users, StudentRepository students, ClassroomRepository classrooms,
                                AppointmentSlotRepository slots, PollRepository polls, PollVoteRepository votes,
                                BehaviorRecordRepository behavior, AbsenceRepository absences, Clock clock, SeedLock seedLock) {
        this.seedLock = seedLock;
        this.users = users;
        this.students = students;
        this.classrooms = classrooms;
        this.slots = slots;
        this.polls = polls;
        this.votes = votes;
        this.behavior = behavior;
        this.absences = absences;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedLock.acquire();
        if (polls.count() > 0 || users.countByRole(Role.TEACHER) == 0) {
            return;
        }
        var today = LocalDate.now(clock);
        var math = users.findByEmailIgnoreCase("prof.math@madrasti.ma").orElse(null);
        var french = users.findByEmailIgnoreCase("prof.francais@madrasti.ma").orElse(null);
        var director = users.findByEmailIgnoreCase("direction@madrasti.ma").orElse(null);
        var parent = users.findByEmailIgnoreCase("parent.adari@madrasti.ma").orElse(null);

        seedAppointments(today, math, french, parent);
        seedPolls(today, director, math);
        seedBehavior(today, math, french);

        // Un justificatif en attente : la direction le voit dans « Absences ».
        if (parent != null) {
            students.findByParentIdOrderByFirstName(parent.getId()).stream().findFirst().ifPresent(child ->
                    absences.findByStudentIdOrderByDayDesc(child.getId()).stream().filter(a -> !a.isJustified()).findFirst()
                            .ifPresent(a -> a.submitJustification("Rendez-vous chez l'orthodontiste, certificat remis à l'accueil.", null)));
        }
        log.info("Données de démonstration : rendez-vous, sondages et suivi du comportement créés");
    }

    private void seedAppointments(LocalDate today, User math, User french, User parent) {
        var thursday = today.with(TemporalAdjusters.next(DayOfWeek.THURSDAY));
        if (math != null) {
            for (var i = 0; i < 6; i++) {
                slots.save(new AppointmentSlot(math, thursday.atTime(LocalTime.of(16, 30)).plusMinutes(15L * i), 15,
                        AppointmentSlot.Mode.IN_PERSON, "Salle 12"));
            }
        }
        if (french != null) {
            var saturday = today.with(TemporalAdjusters.next(DayOfWeek.SATURDAY));
            for (var i = 0; i < 4; i++) {
                slots.save(new AppointmentSlot(french, saturday.atTime(LocalTime.of(10, 0)).plusMinutes(20L * i), 20,
                        AppointmentSlot.Mode.VISIO, null));
            }
        }
        if (math != null && parent != null) {
            var child = students.findByParentIdOrderByFirstName(parent.getId()).stream().findFirst().orElse(null);
            var first = slots.findByTeacherIdAndStartsAtAfterOrderByStartsAt(math.getId(), today.atStartOfDay()).stream()
                    .findFirst().orElse(null);
            if (child != null && first != null) {
                slots.flush();
                slots.book(first.getId(), parent, child, "Faire le point sur les fractions avant le contrôle");
            }
        }
    }

    private void seedPolls(LocalDate today, User director, User teacher) {
        var trip = polls.save(new Poll("Sortie de fin d'année : quelle destination préférez-vous ?", Audience.PARENTS,
                today.plusDays(10), director, List.of("Parc Oued Fès", "Jardin Majorelle", "Musée Mohammed VI")));
        polls.save(new Poll("Quel créneau pour la réunion parents-professeurs du 2e trimestre ?", Audience.ALL,
                today.plusDays(5), director, List.of("Mercredi 17h", "Vendredi 18h", "Samedi 10h")));
        polls.save(new Poll("Club du mercredi : quelle activité ajouter ?", Audience.STUDENTS, today.plusDays(14),
                teacher, List.of("Robotique", "Échecs", "Théâtre", "Photographie")));
        // Quelques réponses de familles pour que les résultats ne soient pas vides.
        var parents = users.findByRoleInAndActiveTrue(List.of(Role.PARENT)).stream()
                .filter(p -> !p.getEmail().equals("parent.adari@madrasti.ma")).toList();
        for (var i = 0; i < parents.size(); i++) {
            votes.save(new PollVote(trip, trip.getOptions().get(i % 2 == 0 ? 1 : i % 3), parents.get(i)));
        }
    }

    private void seedBehavior(LocalDate today, User math, User french) {
        if (math == null) return;
        var notes = List.of(
                new Object[]{Category.PARTICIPATION, "Excellente participation au tableau"},
                new Object[]{Category.HELPING, "A aidé un camarade à comprendre l'exercice"},
                new Object[]{Category.EFFORT, null},
                new Object[]{Category.TEAMWORK, "Très bon travail en groupe sur l'exposé"},
                new Object[]{Category.FORGOTTEN_MATERIAL, "Cahier oublié"},
                new Object[]{Category.DISRUPTION, "Bavardages répétés"});
        var index = 0;
        for (var classroom : classrooms.findAllDetailed()) {
            for (var student : students.findByClassroomId(classroom.getId())) {
                for (var k = 0; k < 2 + index % 3; k++) {
                    var n = notes.get((index + k * 2) % notes.size());
                    var category = (Category) n[0];
                    behavior.save(new BehaviorRecord(student, k % 2 == 0 ? math : (french == null ? math : french), category,
                            category == Category.DISRUPTION && index % 4 == 0 ? BehaviorRecord.Sanction.WARNING : null,
                            (String) n[1], today.minusDays(index % 9 + k * 3L)));
                }
                index++;
            }
        }
    }
}
