package ma.madrasti.sms;

import ma.madrasti.attendance.Absence;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.student.Student;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.*;

/** Envoi et journal des SMS ; chaque SMS est rédigé dans la langue préférée de son destinataire. */
@Service
public class SmsService {

    public enum Audience { CLASS_PARENTS, ALL_PARENTS, ALL_TEACHERS }

    public record BroadcastResult(int sent, int skipped, int failed) {
    }

    private static final DateTimeFormatter DAY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final SmsGateway gateway;
    private final SmsRepository history;
    private final StudentRepository students;
    private final UserRepository users;
    private final MessageSource messages;
    private final boolean absenceAlerts;

    public SmsService(SmsGateway gateway, SmsRepository history, StudentRepository students, UserRepository users,
                      MessageSource messages, MadrastiProperties properties) {
        this.gateway = gateway;
        this.history = history;
        this.students = students;
        this.users = users;
        this.messages = messages;
        this.absenceAlerts = properties.sms().absenceAlerts();
    }

    /** Alerte automatique du parent lors d'une absence ou d'un retard (si activée). */
    @Transactional
    public void absenceAlert(Student student, Absence absence) {
        var parent = student.getParent();
        if (!absenceAlerts || parent == null) {
            return;
        }
        var locale = Locale.forLanguageTag(parent.getLanguage());
        var kind = messages.getMessage("sms.kind." + absence.getKind().name(), null, locale);
        var text = messages.getMessage("sms.absence", new Object[]{student.getFirstName(), kind, absence.getDay().format(DAY)}, locale);
        deliver(parent, text, null);
    }

    @Transactional
    public BroadcastResult broadcast(Audience audience, Long classroomId, String text) {
        var recipients = switch (audience) {
            case CLASS_PARENTS -> students.findByClassroomId(classroomId).stream().map(Student::getParent)
                    .filter(Objects::nonNull).toList();
            case ALL_PARENTS -> users.findByRoleInAndActiveTrue(EnumSet.of(Role.PARENT));
            case ALL_TEACHERS -> users.findByRoleInAndActiveTrue(EnumSet.of(Role.TEACHER));
        };
        var unique = new LinkedHashMap<Long, User>();
        recipients.forEach(u -> unique.putIfAbsent(u.getId(), u));
        var sender = users.getReferenceById(CurrentUser.get().id());
        int sent = 0, skipped = 0, failed = 0;
        for (var user : unique.values()) {
            switch (deliver(user, text, sender)) {
                case SENT -> sent++;
                case SKIPPED -> skipped++;
                case FAILED -> failed++;
            }
        }
        return new BroadcastResult(sent, skipped, failed);
    }

    @Transactional(readOnly = true)
    public List<SmsMessage> recent() {
        return history.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 100));
    }

    private SmsMessage.Status deliver(User user, String text, User sender) {
        var phone = user.getPhone() == null ? null : user.getPhone().replaceAll("[\\s().-]", "");
        if (phone == null || phone.isBlank()) {
            history.save(new SmsMessage(null, user.fullName(), text, SmsMessage.Status.SKIPPED, "no-phone", sender));
            return SmsMessage.Status.SKIPPED;
        }
        try {
            gateway.send(phone, text);
            history.save(new SmsMessage(phone, user.fullName(), text, SmsMessage.Status.SENT, null, sender));
            return SmsMessage.Status.SENT;
        } catch (SmsGateway.SmsException e) {
            history.save(new SmsMessage(phone, user.fullName(), text, SmsMessage.Status.FAILED,
                    e.getMessage().substring(0, Math.min(255, e.getMessage().length())), sender));
            return SmsMessage.Status.FAILED;
        }
    }
}
