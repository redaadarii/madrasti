package ma.madrasti.config;

import ma.madrasti.council.CouncilDecision;
import ma.madrasti.council.CouncilDecisionRepository;
import ma.madrasti.course.CourseResource;
import ma.madrasti.course.CourseResourceRepository;
import ma.madrasti.expense.Expense;
import ma.madrasti.expense.ExpenseRepository;
import ma.madrasti.gallery.Album;
import ma.madrasti.gallery.AlbumRepository;
import ma.madrasti.gallery.Photo;
import ma.madrasti.notification.NotificationService;
import ma.madrasti.notification.NotificationType;
import ma.madrasti.report.ClassAverages;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.storage.StorageService;
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

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

/** Données de démonstration : SMS (téléphones), dépenses, galerie, cours en ligne, conseil de classe. */
@Component
@Order(3)
@ConditionalOnBooleanProperty("madrasti.seed-demo-data")
public class MediaDemoSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MediaDemoSeeder.class);

    private final UserRepository users;
    private final StudentRepository students;
    private final ClassroomRepository classrooms;
    private final ExpenseRepository expenses;
    private final AlbumRepository albums;
    private final CourseResourceRepository resources;
    private final CouncilDecisionRepository decisions;
    private final ClassAverages averages;
    private final StorageService storage;
    private final NotificationService notifier;
    private final Clock clock;
    private final SeedLock seedLock;

    public MediaDemoSeeder(UserRepository users, StudentRepository students, ClassroomRepository classrooms,
                           ExpenseRepository expenses, AlbumRepository albums, CourseResourceRepository resources,
                           CouncilDecisionRepository decisions, ClassAverages averages, StorageService storage,
                           NotificationService notifier, Clock clock, SeedLock seedLock) {
        this.seedLock = seedLock;
        this.users = users;
        this.students = students;
        this.classrooms = classrooms;
        this.expenses = expenses;
        this.albums = albums;
        this.resources = resources;
        this.decisions = decisions;
        this.averages = averages;
        this.storage = storage;
        this.notifier = notifier;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedLock.acquire();
        if (expenses.count() > 0 || users.countByRole(Role.TEACHER) == 0) {
            return;
        }
        var today = LocalDate.now(clock);
        var teachers = users.findAll().stream().filter(u -> u.getRole() == Role.TEACHER)
                .sorted(Comparator.comparing(User::getId)).toList();
        var director = users.findByEmailIgnoreCase("direction@madrasti.ma").orElse(teachers.getFirst());

        // Téléphones (SMS) et une famille arabophone pour montrer la langue des SMS et notifications.
        var index = 0;
        for (var user : users.findAll()) {
            if (user.getPhone() == null && (user.getRole() == Role.PARENT || user.getRole() == Role.TEACHER)) {
                user.setPhone("+212 661 %06d".formatted(100_000 + ++index));
            }
        }
        users.findByEmailIgnoreCase("parent.berrada@madrasti.ma").ifPresent(u -> u.setLanguage("ar"));

        var serial = 123_456_000;
        for (var student : students.findAll()) {
            if (student.getMassarCode() == null) {
                student.setMassarCode("G" + (++serial));
            }
        }

        seedExpenses(today);
        var classes = classrooms.findAllDetailed();
        seedGallery(classes.getFirst(), director, teachers.getFirst());
        seedResources(classes, teachers);
        seedCouncil(classes);

        users.findByEmailIgnoreCase("parent.adari@madrasti.ma").ifPresent(parent -> notifier.notify(List.of(parent),
                NotificationType.ANNOUNCEMENT, "/announcements", Map.of("title", "Bienvenue sur Madrasti")));
        log.info("Données de démonstration : dépenses, galerie, cours en ligne et conseil de classe créés");
    }

    private void seedExpenses(LocalDate today) {
        record Line(String label, Expense.Category category, String supplier, String ref, int amount, int monthsAgo, Expense.Status status) {
        }
        var lines = List.of(
                new Line("Salaires — personnel enseignant", Expense.Category.SALARIES, null, null, 48_000, 1, Expense.Status.PAID),
                new Line("Salaires — personnel enseignant", Expense.Category.SALARIES, null, null, 48_000, 0, Expense.Status.INVOICED),
                new Line("Fournitures de rentrée (cahiers, craies, feutres)", Expense.Category.SUPPLIES, "Librairie Al Madina", "BC-2026-014", 6_400, 2, Expense.Status.PAID),
                new Line("Entretien des climatiseurs", Expense.Category.MAINTENANCE, "Froid Service Casa", "BC-2026-019", 3_200, 1, Expense.Status.PAID),
                new Line("Carburant — bus ligne A et B", Expense.Category.TRANSPORT, "Afriquia", "FAC-88731", 4_850, 0, Expense.Status.PAID),
                new Line("Denrées cantine — octobre", Expense.Category.CANTEEN, "Marjane Pro", "BC-2026-021", 9_700, 0, Expense.Status.INVOICED),
                new Line("Électricité et eau", Expense.Category.UTILITIES, "Lydec", "FAC-2026-10", 5_300, 0, Expense.Status.ORDERED),
                new Line("Kits robotique (club)", Expense.Category.SUPPLIES, "RoboMaroc", "BC-2026-023", 7_900, 0, Expense.Status.ORDERED));
        for (var l : lines) {
            var date = today.minusMonths(l.monthsAgo()).withDayOfMonth(Math.min(5, today.getDayOfMonth()));
            var expense = new Expense(l.label(), l.category(), l.supplier(), l.ref(), BigDecimal.valueOf(l.amount()), date);
            expense.moveTo(l.status(), date.plusDays(2));
            expenses.save(expense);
        }
    }

    private void seedGallery(ma.madrasti.school.Classroom classroom, User director, User teacher) {
        var openDay = new Album("Journée sportive", "Tournoi de football et relais inter-classes.", null, director);
        var colors = List.of(new Color(0x4F3FD6), new Color(0xF2805A), new Color(0x4FC4B3), new Color(0xF4C95D));
        for (var i = 0; i < 4; i++) {
            openDay.getPhotos().add(new Photo(openDay, image("Sport " + (i + 1), colors.get(i), colors.get((i + 1) % 4)), null));
        }
        albums.save(openDay);
        var trip = new Album("Sortie au jardin Majorelle", "Classe " + classroom.getName() + " — observation des plantes.", classroom, teacher);
        for (var i = 0; i < 3; i++) {
            trip.getPhotos().add(new Photo(trip, image("Majorelle " + (i + 1), new Color(0x1D4ED8), new Color(0x4FC4B3)), "Photo " + (i + 1)));
        }
        albums.save(trip);
    }

    private void seedResources(List<ma.madrasti.school.Classroom> classes, List<User> teachers) {
        for (var classroom : classes) {
            var teacher = classroom.getMainTeacher() != null ? classroom.getMainTeacher() : teachers.getFirst();
            resources.save(new CourseResource(classroom, teacher, "Mathématiques", "Fiche de synthèse — les fractions",
                    "Définitions, simplification et opérations, avec exemples corrigés.", CourseResource.Kind.FILE, null,
                    pdf("Fiche de synthese - les fractions")));
            resources.save(new CourseResource(classroom, teacher, "Mathématiques", "Vidéo : additionner des fractions",
                    "Leçon en vidéo (Khan Academy).", CourseResource.Kind.VIDEO,
                    "https://fr.khanacademy.org/math/arithmetic/fraction-arithmetic", null));
            resources.save(new CourseResource(classroom, teachers.get(2 % teachers.size()), "Sciences", "Le cycle de l'eau",
                    "Animation interactive pour réviser avant l'exposé.", CourseResource.Kind.LINK,
                    "https://www.lumni.fr/video/le-cycle-de-l-eau", null));
        }
    }

    private void seedCouncil(List<ma.madrasti.school.Classroom> classes) {
        var classroom = classes.get(1 % classes.size());
        var computed = averages.compute(classroom.getId(), "T1");
        for (var student : students.findByClassroomId(classroom.getId())) {
            var avg = computed.get(student.getId());
            if (avg == null) continue;
            var decision = new CouncilDecision(student, "T1");
            decision.record(CouncilDecision.suggest(avg.overall()), avg.overall() >= 12
                    ? "Bon trimestre, élève sérieux et impliqué. Continuez ainsi !"
                    : "Des efforts à fournir, notamment dans la régularité du travail personnel.");
            decisions.save(decision);
        }
    }

    private ma.madrasti.storage.StoredFile image(String label, Color from, Color to) {
        var img = new BufferedImage(960, 640, BufferedImage.TYPE_INT_RGB);
        var g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setPaint(new GradientPaint(0, 0, from, 960, 640, to));
        g.fillRect(0, 0, 960, 640);
        g.setColor(new Color(255, 255, 255, 60));
        for (var i = 0; i < 6; i++) {
            g.fillOval(80 + i * 140, 120 + (i % 2) * 220, 180, 180);
        }
        g.setColor(Color.WHITE);
        g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 64));
        g.drawString(label, 60, 580);
        g.dispose();
        try (var out = new ByteArrayOutputStream()) {
            ImageIO.write(img, "png", out);
            var bytes = out.toByteArray();
            return storage.store(label.toLowerCase().replace(' ', '-') + ".png", "image/png", new ByteArrayInputStream(bytes), bytes.length);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** PDF minimal d'une page (aucune dépendance) pour illustrer les supports de cours. */
    private ma.madrasti.storage.StoredFile pdf(String title) {
        var content = "BT /F1 24 Tf 60 760 Td (" + title + ") Tj /F1 12 Tf 0 -40 Td (Madrasti - support de cours de demonstration) Tj ET";
        var objects = List.of(
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
                "<< /Length " + content.length() + " >>\nstream\n" + content + "\nendstream",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
        var pdf = new StringBuilder("%PDF-1.4\n");
        var offsets = new ArrayList<Integer>();
        for (var i = 0; i < objects.size(); i++) {
            offsets.add(pdf.length());
            pdf.append(i + 1).append(" 0 obj\n").append(objects.get(i)).append("\nendobj\n");
        }
        var xref = pdf.length();
        pdf.append("xref\n0 ").append(objects.size() + 1).append("\n0000000000 65535 f \n");
        offsets.forEach(o -> pdf.append("%010d 00000 n \n".formatted(o)));
        pdf.append("trailer\n<< /Size ").append(objects.size() + 1).append(" /Root 1 0 R >>\nstartxref\n").append(xref).append("\n%%EOF\n");
        var bytes = pdf.toString().getBytes(StandardCharsets.US_ASCII);
        return storage.store(title.toLowerCase().replace(' ', '-') + ".pdf", "application/pdf", new ByteArrayInputStream(bytes), bytes.length);
    }
}
