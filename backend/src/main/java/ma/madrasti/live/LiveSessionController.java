package ma.madrasti.live;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;

/** Classes en direct : planification et accès aux visioconférences par classe. */
@RestController
@RequestMapping("/api/live-sessions")
@Transactional
public class LiveSessionController {

    public record LiveSessionRequest(@NotNull Long classroomId, @NotBlank String subject,
                                     @NotBlank @Size(max = 150) String title, @NotNull @Future Instant startsAt,
                                     @Min(15) @Max(240) int durationMinutes, @NotNull LiveProvider provider,
                                     @Pattern(regexp = "https://.+", message = "{validation.url.https}") String meetingUrl) {

        @AssertTrue(message = "{validation.meetingUrl.required}")
        public boolean isExternalUrlPresent() {
            return provider != LiveProvider.EXTERNAL || (meetingUrl != null && !meetingUrl.isBlank());
        }
    }

    public record LiveSessionResponse(Long id, Long classroomId, String classroomName, Long teacherId,
                                      String teacherName, String subject, String title, Instant startsAt,
                                      Instant endsAt, int durationMinutes, LiveProvider provider, String meetingUrl,
                                      LiveSession.Status status) {

        static LiveSessionResponse from(LiveSession s, Instant now) {
            return new LiveSessionResponse(s.getId(), s.getClassroom().getId(), s.getClassroom().getName(),
                    s.getTeacher().getId(), s.getTeacher().fullName(), s.getSubject(), s.getTitle(), s.getStartsAt(),
                    s.endsAt(), s.getDurationMinutes(), s.getProvider(), s.getMeetingUrl(), s.status(now));
        }
    }

    /** Historique conservé à l'écran : les cours de la dernière semaine. */
    private static final Duration HISTORY = Duration.ofDays(7);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final LiveSessionRepository sessions;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final StudentAccess access;
    private final Clock clock;
    private final String jitsiBaseUrl;
    private final ma.madrasti.notification.NotificationService notifier;

    public LiveSessionController(LiveSessionRepository sessions, ClassroomRepository classrooms, UserRepository users,
                                 StudentAccess access, Clock clock, MadrastiProperties properties,
                                 ma.madrasti.notification.NotificationService notifier) {
        this.sessions = sessions;
        this.classrooms = classrooms;
        this.users = users;
        this.access = access;
        this.clock = clock;
        this.jitsiBaseUrl = properties.live().jitsiBaseUrl();
        this.notifier = notifier;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<LiveSessionResponse> list() {
        var now = clock.instant();
        var from = now.minus(HISTORY);
        var visible = access.visibleClassroomIds();
        var list = visible == null
                ? sessions.findByStartsAtAfterOrderByStartsAtAsc(from)
                : visible.isEmpty() ? List.<LiveSession>of()
                : sessions.findByClassroomIdInAndStartsAtAfterOrderByStartsAtAsc(visible, from);
        return list.stream().map(s -> LiveSessionResponse.from(s, now)).toList();
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public LiveSessionResponse get(@PathVariable Long id) {
        var session = find(id);
        var visible = access.visibleClassroomIds();
        if (visible != null && !visible.contains(session.getClassroom().getId())) {
            throw new AccessDeniedException("Ce cours ne concerne pas votre classe");
        }
        return LiveSessionResponse.from(session, clock.instant());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public LiveSessionResponse schedule(@Valid @RequestBody LiveSessionRequest request) {
        var classroom = classrooms.findById(request.classroomId())
                .orElseThrow(() -> new NotFoundException("classroom", request.classroomId()));
        var url = request.provider() == LiveProvider.JITSI ? jitsiRoom(jitsiBaseUrl, classroom.getName()) : request.meetingUrl().trim();
        var session = sessions.save(new LiveSession(classroom, users.getReferenceById(CurrentUser.get().id()),
                request.subject(), request.title(), request.startsAt(), request.durationMinutes(), request.provider(), url));
        notifier.notify(notifier.classroom(classroom.getId(), false), ma.madrasti.notification.NotificationType.LIVE_SESSION, "/live",
                java.util.Map.of("title", request.title(), "subject", request.subject(), "date", request.startsAt().toString()));
        return LiveSessionResponse.from(session, clock.instant());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void cancel(@PathVariable Long id) {
        var session = find(id);
        var current = CurrentUser.get();
        if (current.role() == Role.TEACHER && !session.getTeacher().getId().equals(current.id())) {
            throw new AccessDeniedException("Seul l'enseignant qui a planifié ce cours peut l'annuler");
        }
        sessions.delete(session);
    }

    /** Nom de salle Jitsi non devinable : seuls les membres de la classe le connaissent. */
    static String jitsiRoom(String baseUrl, String classroomName) {
        var bytes = new byte[8];
        RANDOM.nextBytes(bytes);
        var slug = classroomName.replaceAll("[^A-Za-z0-9]", "");
        return baseUrl.replaceAll("/+$", "") + "/Madrasti-" + slug + "-" + HexFormat.of().formatHex(bytes);
    }

    private LiveSession find(Long id) {
        return sessions.findById(id).orElseThrow(() -> new NotFoundException("liveSession", id));
    }
}
