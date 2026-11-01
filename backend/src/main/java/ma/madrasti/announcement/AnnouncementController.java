package ma.madrasti.announcement;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

/** Communication école → familles / équipe pédagogique. */
@RestController
@RequestMapping("/api/announcements")
@Transactional
public class AnnouncementController {

    public record AnnouncementRequest(@NotBlank @Size(max = 150) String title, @NotBlank String content,
                                      @NotNull Audience audience, boolean pinned) {
    }

    public record AnnouncementResponse(Long id, String title, String content, Audience audience, boolean pinned,
                                       Long authorId, String authorName, Instant createdAt) {

        static AnnouncementResponse from(Announcement a) {
            return new AnnouncementResponse(a.getId(), a.getTitle(), a.getContent(), a.getAudience(), a.isPinned(),
                    a.getAuthor().getId(), a.getAuthor().fullName(), a.getCreatedAt());
        }
    }

    private final AnnouncementRepository announcements;
    private final UserRepository users;
    private final ma.madrasti.notification.NotificationService notifier;

    public AnnouncementController(AnnouncementRepository announcements, UserRepository users, ma.madrasti.notification.NotificationService notifier) {
        this.announcements = announcements;
        this.users = users;
        this.notifier = notifier;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<AnnouncementResponse> list(@RequestParam(defaultValue = "50") int limit) {
        var audiences = Audience.visibleTo(CurrentUser.get().role());
        return announcements.findVisible(audiences, PageRequest.of(0, Math.clamp(limit, 1, 200))).stream()
                .map(AnnouncementResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public AnnouncementResponse publish(@Valid @RequestBody AnnouncementRequest request) {
        var current = CurrentUser.get();
        var author = users.findById(current.id()).orElseThrow(() -> new NotFoundException("user", current.id()));
        var announcement = announcements.save(
                new Announcement(request.title(), request.content(), request.audience(), request.pinned(), author));
        var recipients = notifier.audience(request.audience()).stream().filter(u -> !u.getId().equals(author.getId())).toList();
        notifier.notify(recipients, ma.madrasti.notification.NotificationType.ANNOUNCEMENT, "/announcements", java.util.Map.of("title", request.title()));
        return AnnouncementResponse.from(announcement);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        var announcement = announcements.findById(id).orElseThrow(() -> new NotFoundException("announcement", id));
        var current = CurrentUser.get();
        if (current.role() == Role.TEACHER && !announcement.getAuthor().getId().equals(current.id())) {
            throw new AccessDeniedException("Seul l'auteur peut supprimer cette annonce");
        }
        announcements.delete(announcement);
    }
}
