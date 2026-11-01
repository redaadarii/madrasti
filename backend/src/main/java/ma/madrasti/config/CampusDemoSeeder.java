package ma.madrasti.config;

import ma.madrasti.admission.PreRegistration;
import ma.madrasti.admission.PreRegistrationRepository;
import ma.madrasti.calendar.EventKind;
import ma.madrasti.calendar.SchoolEvent;
import ma.madrasti.calendar.SchoolEventRepository;
import ma.madrasti.complaint.Complaint;
import ma.madrasti.complaint.ComplaintRepository;
import ma.madrasti.library.Book;
import ma.madrasti.library.BookRepository;
import ma.madrasti.library.Loan;
import ma.madrasti.library.LoanRepository;
import ma.madrasti.messaging.*;
import ma.madrasti.quiz.Quiz;
import ma.madrasti.quiz.QuizAttempt;
import ma.madrasti.quiz.QuizAttemptRepository;
import ma.madrasti.quiz.QuizRepository;
import ma.madrasti.school.Classroom;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.services.CampusService;
import ma.madrasti.services.CampusServiceRepository;
import ma.madrasti.services.Subscription;
import ma.madrasti.services.SubscriptionRepository;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.timetable.TimetableSlot;
import ma.madrasti.timetable.TimetableSlotRepository;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.core.annotation.Order;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;

/** Données de démonstration de la vie du campus, ajoutées une seule fois après {@link DemoDataSeeder}. */
@Component
@Order(2)
@ConditionalOnBooleanProperty("madrasti.seed-demo-data")
public class CampusDemoSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CampusDemoSeeder.class);
    private static final LocalTime[][] PERIODS = {
            {LocalTime.of(8, 30), LocalTime.of(10, 0)}, {LocalTime.of(10, 15), LocalTime.of(11, 45)},
            {LocalTime.of(13, 30), LocalTime.of(15, 0)}, {LocalTime.of(15, 15), LocalTime.of(16, 45)}};
    private static final String[] TEACHER_SUBJECTS = {"Mathématiques", "Français", "Sciences"};

    private final UserRepository users;
    private final ClassroomRepository classrooms;
    private final StudentRepository students;
    private final TimetableSlotRepository slots;
    private final SchoolEventRepository events;
    private final ConversationRepository conversations;
    private final ParticipantRepository participants;
    private final MessageRepository messages;
    private final ComplaintRepository complaints;
    private final QuizRepository quizzes;
    private final QuizAttemptRepository attempts;
    private final CampusServiceRepository services;
    private final SubscriptionRepository subscriptions;
    private final BookRepository books;
    private final LoanRepository loans;
    private final PreRegistrationRepository preRegistrations;
    private final Clock clock;
    private final SeedLock seedLock;

    public CampusDemoSeeder(UserRepository users, ClassroomRepository classrooms, StudentRepository students,
                            TimetableSlotRepository slots, SchoolEventRepository events,
                            ConversationRepository conversations, ParticipantRepository participants,
                            MessageRepository messages, ComplaintRepository complaints, QuizRepository quizzes,
                            QuizAttemptRepository attempts, CampusServiceRepository services,
                            SubscriptionRepository subscriptions, BookRepository books, LoanRepository loans,
                            PreRegistrationRepository preRegistrations, Clock clock, SeedLock seedLock) {
        this.seedLock = seedLock;
        this.users = users;
        this.classrooms = classrooms;
        this.students = students;
        this.slots = slots;
        this.events = events;
        this.conversations = conversations;
        this.participants = participants;
        this.messages = messages;
        this.complaints = complaints;
        this.quizzes = quizzes;
        this.attempts = attempts;
        this.services = services;
        this.subscriptions = subscriptions;
        this.books = books;
        this.loans = loans;
        this.preRegistrations = preRegistrations;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedLock.acquire();
        if (slots.count() > 0 || users.countByRole(Role.TEACHER) == 0) {
            return;
        }
        var teachers = users.findAll().stream().filter(u -> u.getRole() == Role.TEACHER)
                .sorted(java.util.Comparator.comparing(User::getId)).toList();
        var director = users.findByEmailIgnoreCase("direction@madrasti.ma").orElse(teachers.getFirst());
        var classes = classrooms.findAllDetailed();
        var today = LocalDate.now(clock);
        var zone = clock.getZone();

        seedTimetable(classes, teachers);
        seedEvents(classes, director, teachers.getFirst(), today, zone);
        seedQuizzes(classes, teachers, today);
        seedServices();
        seedLibrary(today);
        seedMessagesAndComplaints(teachers.getFirst(), director);
        seedPreRegistrations();
        log.info("Vie du campus créée : emploi du temps, agenda, quiz, services, bibliothèque, messagerie");
    }

    /** Chaque enseignant a une seule classe par créneau : aucun conflit possible. */
    private void seedTimetable(List<Classroom> classes, List<User> teachers) {
        for (var c = 0; c < classes.size(); c++) {
            for (var day = 1; day <= 5; day++) {
                for (var p = 0; p < PERIODS.length; p++) {
                    if (day == 3 && p >= 2) {
                        continue; // mercredi après-midi libre
                    }
                    var t = (c + p + day) % teachers.size();
                    slots.save(new TimetableSlot(classes.get(c), teachers.get(t), day, PERIODS[p][0], PERIODS[p][1],
                            TEACHER_SUBJECTS[t % TEACHER_SUBJECTS.length], "Salle " + (101 + c)));
                }
            }
        }
    }

    private void seedEvents(List<Classroom> classes, User director, User teacher, LocalDate today, ZoneId zone) {
        events.save(new SchoolEvent("Journée portes ouvertes", "Présentation des projets des élèves et visite des ateliers.",
                EventKind.EVENT, at(today.plusDays(9), 9, zone), at(today.plusDays(9), 13, zone), null, director));
        events.save(new SchoolEvent("Fête de l'Indépendance", "Pas de cours.", EventKind.HOLIDAY,
                at(LocalDate.of(today.getYear(), 11, 18), 0, zone), null, null, director));
        events.save(new SchoolEvent("Réunion parents-professeurs", "Amphithéâtre — rencontre avec l'équipe pédagogique.",
                EventKind.MEETING, at(today.plusDays(2), 10, zone), at(today.plusDays(2), 12, zone), null, director));
        events.save(new SchoolEvent("Conseil de classe T1", "Bilan du premier trimestre.", EventKind.MEETING,
                at(today.plusDays(16), 14, zone), at(today.plusDays(16), 17, zone), null, director));
        for (var classroom : classes) {
            events.save(new SchoolEvent("Contrôle de mathématiques", "Chapitre : fractions et nombres décimaux.",
                    EventKind.EXAM, at(today.plusDays(4), 8, zone), at(today.plusDays(4), 10, zone), classroom, teacher));
        }
    }

    private void seedQuizzes(List<Classroom> classes, List<User> teachers, LocalDate today) {
        for (var classroom : classes) {
            var quiz = new Quiz(classroom, teachers.getFirst(), "Mathématiques", "Fractions — échauffement", today.plusDays(7));
            quiz.addQuestion("Combien font 1/2 + 1/4 ?", List.of("2/6", "3/4", "1/8", "2/4"), 1);
            quiz.addQuestion("Quelle fraction est égale à 0,5 ?", List.of("1/5", "5/1", "1/2", "2/5"), 2);
            quiz.addQuestion("Simplifie 6/8.", List.of("3/4", "2/3", "6/8", "4/3"), 0);
            quiz.addQuestion("Quel est le plus grand nombre ?", List.of("2/3", "3/5", "1/2", "5/9"), 0);
            quizzes.save(quiz);

            var culture = new Quiz(classroom, teachers.get(2 % teachers.size()), "Sciences", "Le cycle de l'eau", today.plusDays(10));
            culture.addQuestion("Comment s'appelle le passage de l'eau liquide à la vapeur ?",
                    List.of("Condensation", "Évaporation", "Solidification"), 1);
            culture.addQuestion("Les nuages sont formés de…", List.of("Fumée", "Gouttelettes d'eau", "Poussière"), 1);
            culture.addQuestion("La pluie, la neige et la grêle sont des…", List.of("Précipitations", "Infiltrations", "Ruissellements"), 0);
            quizzes.save(culture);

            var classStudents = students.search(null, classroom.getId(), PageRequest.of(0, 100)).getContent();
            if (classStudents.size() > 1) {
                attempts.save(new QuizAttempt(quiz, classStudents.get(1), List.of(1, 2, 0, 1), clock.instant()));
            }
        }
    }

    private void seedServices() {
        var lineA = services.save(new CampusService(CampusService.Kind.TRANSPORT, "Ligne A — Maârif / Anfa",
                "Ramassage matin et soir, accompagnatrice à bord.", "7h15 – 17h30", BigDecimal.valueOf(450), 30));
        services.save(new CampusService(CampusService.Kind.TRANSPORT, "Ligne B — Californie / Oasis",
                "Ramassage matin et soir.", "7h05 – 17h40", BigDecimal.valueOf(450), 25));
        var canteen = services.save(new CampusService(CampusService.Kind.CANTEEN, "Déjeuner équilibré",
                "Menus validés par une diététicienne, affichés chaque semaine.", "12h00 – 13h15", BigDecimal.valueOf(600), null));
        services.save(new CampusService(CampusService.Kind.CANTEEN, "Garderie du soir",
                "Étude surveillée et goûter.", "16h45 – 18h30", BigDecimal.valueOf(300), 40));
        services.save(new CampusService(CampusService.Kind.ACTIVITY, "Club robotique",
                "Initiation à la programmation et construction de robots.", "Mercredi 14h – 16h", BigDecimal.valueOf(350), 15));
        services.save(new CampusService(CampusService.Kind.ACTIVITY, "Natation",
                "Cours encadrés par un maître-nageur.", "Samedi 9h – 10h30", BigDecimal.valueOf(400), 20));
        services.save(new CampusService(CampusService.Kind.ACTIVITY, "Théâtre en arabe et en français",
                "Expression orale et spectacle de fin d'année.", "Mercredi 14h – 15h30", BigDecimal.valueOf(250), 18));
        students.findAll().stream().limit(4).forEach(student -> {
            subscriptions.save(new Subscription(lineA, student));
            subscriptions.save(new Subscription(canteen, student));
        });
    }

    private void seedLibrary(LocalDate today) {
        var catalog = List.of(
                new Book("Le Petit Prince", "Antoine de Saint-Exupéry", "9782070612758", "Roman", 4),
                new Book("La Boîte à merveilles", "Ahmed Sefrioui", "9782020238861", "Littérature marocaine", 3),
                new Book("Le Petit Nicolas", "René Goscinny et Sempé", "9782070612765", "Jeunesse", 5),
                new Book("Charlie et la chocolaterie", "Roald Dahl", "9782070601578", "Jeunesse", 3),
                new Book("Vingt mille lieues sous les mers", "Jules Verne", "9782253006329", "Aventure", 2),
                new Book("Kalila wa Dimna", "Ibn al-Muqaffa", null, "Contes", 2),
                new Book("Mon premier atlas", "Collectif", null, "Documentaire", 2),
                new Book("Le Lion", "Joseph Kessel", "9782070367924", "Roman", 1));
        books.saveAll(catalog);
        var all = students.findAll();
        if (all.size() > 2) {
            loans.save(new Loan(catalog.getFirst(), all.getFirst(), today.minusDays(5), today.plusDays(9)));
            loans.save(new Loan(catalog.get(7), all.get(1), today.minusDays(20), today.minusDays(6)));
            loans.save(new Loan(catalog.get(2), all.get(2), today.minusDays(2), today.plusDays(12)));
        }
    }

    private void seedMessagesAndComplaints(User teacher, User director) {
        users.findByEmailIgnoreCase("parent.adari@madrasti.ma").ifPresent(parent -> {
            var now = clock.instant();
            var conversation = new Conversation("Devoirs de mathématiques d'Adam");
            conversation.touch("Merci pour votre retour !", now);
            conversations.save(conversation);
            var parentSide = participants.save(new Participant(conversation, parent));
            participants.save(new Participant(conversation, teacher));
            messages.save(new Message(conversation, parent,
                    "Bonjour Madame, Adam a eu du mal avec l'exercice 7. Pourriez-vous le revoir avec lui ?"));
            messages.save(new Message(conversation, teacher,
                    "Bonjour, bien sûr : nous le reprendrons en classe jeudi et lors du cours en direct de révisions."));
            messages.save(new Message(conversation, parent, "Merci pour votre retour !"));
            parentSide.markRead(now);

            var adam = students.findByParentIdOrderByFirstName(parent.getId()).stream().findFirst().orElse(null);
            var late = new Complaint(parent, adam, Complaint.Category.TRANSPORT, "Retards du bus ligne A",
                    "Le bus est arrivé avec 20 minutes de retard trois matins cette semaine.");
            late.handle(Complaint.Status.IN_PROGRESS,
                    "Nous avons contacté le prestataire, un nouvel itinéraire est testé dès lundi.");
            complaints.save(late);
            complaints.save(new Complaint(parent, adam, Complaint.Category.CANTEEN, "Menu sans arachides",
                    "Adam est allergique aux arachides : est-il possible d'adapter son menu ?"));

            var staff = new Conversation("Saisie des notes du T1");
            staff.touch("Merci de finaliser la saisie avant vendredi.", now);
            conversations.save(staff);
            participants.save(new Participant(staff, director)).markRead(now);
            participants.save(new Participant(staff, teacher));
            messages.save(new Message(staff, director, "Merci de finaliser la saisie avant vendredi."));
        });
    }

    private void seedPreRegistrations() {
        preRegistrations.save(new PreRegistration("Yassine", "Bennani", LocalDate.of(2020, 4, 12), "Grande section",
                "Samira Bennani", "samira.bennani@example.com", "+212 661 00 11 22", "Nous arrivons de Rabat en janvier."));
        preRegistrations.save(new PreRegistration("Malak", "Ouazzani", LocalDate.of(2016, 9, 3), "CM1",
                "Hassan Ouazzani", "h.ouazzani@example.com", "+212 662 33 44 55", null));
        var accepted = new PreRegistration("Rania", "Lahlou", LocalDate.of(2014, 1, 22), "1AC",
                "Nadia Lahlou", "nadia.lahlou@example.com", "+212 663 66 77 88", "Intéressée par le club robotique.");
        accepted.decide(PreRegistration.Status.ACCEPTED);
        preRegistrations.save(accepted);
    }

    private static Instant at(LocalDate date, int hour, ZoneId zone) {
        return date.atTime(hour, 0).atZone(zone).toInstant();
    }
}
