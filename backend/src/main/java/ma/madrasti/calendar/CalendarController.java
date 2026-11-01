package ma.madrasti.calendar;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/** Agenda de l'école : événements, contrôles, réunions et vacances. */
@RestController
@RequestMapping("/api/events")
@Transactional
public class CalendarController {

    public record EventRequest(@NotBlank @Size(max = 150) String title, String description, @NotNull EventKind kind,
                               @NotNull Instant startsAt, Instant endsAt, Long classroomId) {
    }

    public record EventResponse(Long id, String title, String description, EventKind kind, Instant startsAt,
                                Instant endsAt, Long classroomId, String classroomName, Long authorId,
                                String authorName) {

        static EventResponse from(SchoolEvent e) {
            var classroom = e.getClassroom();
            return new EventResponse(e.getId(), e.getTitle(), e.getDescription(), e.getKind(), e.getStartsAt(),
                    e.getEndsAt(), classroom == null ? null : classroom.getId(),
                    classroom == null ? null : classroom.getName(), e.getAuthor().getId(), e.getAuthor().fullName());
        }
    }

    private final SchoolEventRepository events;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final StudentAccess access;

    public CalendarController(SchoolEventRepository events, ClassroomRepository classrooms, UserRepository users,
                              StudentAccess access) {
        this.events = events;
        this.classrooms = classrooms;
        this.users = users;
        this.access = access;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<EventResponse> list(@RequestParam Instant from, @RequestParam Instant to) {
        var visible = access.visibleClassroomIds();
        var list = visible == null ? events.findBetween(from, to)
                : events.findBetweenFor(from, to, visible.isEmpty() ? Set.of(-1L) : visible);
        return list.stream().map(EventResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public EventResponse create(@Valid @RequestBody EventRequest request) {
        var classroom = request.classroomId() == null ? null : classrooms.findById(request.classroomId())
                .orElseThrow(() -> new NotFoundException("classroom", request.classroomId()));
        var author = users.getReferenceById(CurrentUser.get().id());
        return EventResponse.from(events.save(new SchoolEvent(request.title(), request.description(), request.kind(),
                request.startsAt(), request.endsAt(), classroom, author)));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        var event = events.findById(id).orElseThrow(() -> new NotFoundException("event", id));
        var current = CurrentUser.get();
        if (current.role() == Role.TEACHER && !event.getAuthor().getId().equals(current.id())) {
            throw new AccessDeniedException("Seul l'auteur peut supprimer cet événement");
        }
        events.delete(event);
    }
}
