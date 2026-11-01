package ma.madrasti.notification;

import ma.madrasti.announcement.Audience;
import ma.madrasti.student.Student;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.*;

/** Crée les notifications et les pousse en temps réel une fois la transaction validée. */
@Service
public class NotificationService {

    record Created(List<Notification> notifications) {
    }

    private final NotificationRepository notifications;
    private final StudentRepository students;
    private final UserRepository users;
    private final NotificationRelay relay;
    private final ApplicationEventPublisher events;

    public NotificationService(NotificationRepository notifications, StudentRepository students, UserRepository users,
                               NotificationRelay relay, ApplicationEventPublisher events) {
        this.notifications = notifications;
        this.students = students;
        this.users = users;
        this.relay = relay;
        this.events = events;
    }

    @Transactional
    public void notify(Collection<User> recipients, NotificationType type, String link, Map<String, String> params) {
        var unique = new LinkedHashMap<Long, User>();
        recipients.stream().filter(Objects::nonNull).forEach(u -> unique.putIfAbsent(u.getId(), u));
        if (unique.isEmpty()) {
            return;
        }
        var saved = notifications.saveAll(unique.values().stream()
                .map(user -> new Notification(user, type, link, params)).toList());
        events.publishEvent(new Created(saved));
    }

    /** L'élève (s'il a un compte) et son parent. */
    public List<User> family(Student student) {
        var list = new ArrayList<User>();
        if (student.getAccount() != null) list.add(student.getAccount());
        if (student.getParent() != null) list.add(student.getParent());
        return list;
    }

    /** Élèves d'une classe (comptes), avec ou sans leurs parents. */
    public List<User> classroom(Long classroomId, boolean withParents) {
        return students.findByClassroomId(classroomId).stream()
                .flatMap(s -> withParents ? family(s).stream() : Optional.ofNullable(s.getAccount()).stream())
                .toList();
    }

    public List<User> audience(Audience audience) {
        var roles = switch (audience) {
            case ALL -> EnumSet.allOf(Role.class);
            case PARENTS -> EnumSet.of(Role.PARENT);
            case TEACHERS -> EnumSet.of(Role.TEACHER);
            case STUDENTS -> EnumSet.of(Role.STUDENT);
        };
        return users.findByRoleInAndActiveTrue(roles);
    }

    @TransactionalEventListener(fallbackExecution = true)
    void push(Created created) {
        created.notifications().forEach(n -> relay.publish(n.getUser().getId(), NotificationView.from(n)));
    }
}
