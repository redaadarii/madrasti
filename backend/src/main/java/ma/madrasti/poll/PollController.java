package ma.madrasti.poll;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.announcement.Audience;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.notification.NotificationService;
import ma.madrasti.notification.NotificationType;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Sondages (sortie scolaire, choix d'un horaire de réunion, satisfaction…). Les résultats sont visibles une
 * fois que l'on a répondu, à la clôture, et à tout moment pour l'auteur et la direction.
 */
@RestController
@RequestMapping("/api/polls")
@Transactional
public class PollController {

    public record PollRequest(@NotBlank @Size(max = 300) String question, @NotNull Audience audience,
                              @FutureOrPresent LocalDate closesOn,
                              @NotNull @Size(min = 2, max = 6, message = "{validation.poll.options}")
                              List<@NotBlank @Size(max = 150) String> options) {
    }

    public record VoteRequest(@NotNull Long optionId) {
    }

    public record OptionView(Long id, String label, Long votes) {
    }

    public record PollView(Long id, String question, Audience audience, LocalDate closesOn, boolean open,
                           String authorName, boolean canManage, Long myChoice, Long totalVotes, List<OptionView> options) {
    }

    private final PollRepository polls;
    private final PollVoteRepository votes;
    private final UserRepository users;
    private final NotificationService notifier;
    private final Clock clock;

    public PollController(PollRepository polls, PollVoteRepository votes, UserRepository users,
                          NotificationService notifier, Clock clock) {
        this.polls = polls;
        this.votes = votes;
        this.users = users;
        this.notifier = notifier;
        this.clock = clock;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<PollView> list() {
        var me = CurrentUser.get();
        var visible = polls.findVisible(Audience.visibleTo(me.role()), me.id());
        return views(visible, me);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public PollView create(@Valid @RequestBody PollRequest request) {
        var me = CurrentUser.get();
        var labels = request.options().stream().map(String::strip).distinct().toList();
        if (labels.size() < 2) {
            throw new ConflictException("validation.poll.options");
        }
        var poll = polls.save(new Poll(request.question().strip(), request.audience(), request.closesOn(),
                users.getReferenceById(me.id()), labels));
        var audience = notifier.audience(request.audience()).stream().filter(u -> !u.getId().equals(me.id())).toList();
        notifier.notify(audience, NotificationType.POLL, "/polls", Map.of("question", poll.getQuestion()));
        return views(List.of(poll), me).getFirst();
    }

    @PostMapping("/{id}/vote")
    public PollView vote(@PathVariable Long id, @Valid @RequestBody VoteRequest request) {
        var me = CurrentUser.get();
        var poll = visiblePoll(id, me);
        if (!poll.isOpen(LocalDate.now(clock))) {
            throw new ConflictException("error.poll.closed");
        }
        if (votes.existsByPollIdAndUserId(id, me.id())) {
            throw new ConflictException("error.poll.alreadyVoted");
        }
        var option = poll.getOptions().stream().filter(o -> o.getId().equals(request.optionId())).findFirst()
                .orElseThrow(() -> new NotFoundException("pollOption", request.optionId()));
        votes.save(new PollVote(poll, option, users.getReferenceById(me.id())));
        votes.flush();
        return views(List.of(poll), me).getFirst();
    }

    @PostMapping("/{id}/close")
    public PollView close(@PathVariable Long id) {
        var me = CurrentUser.get();
        var poll = managed(id, me);
        poll.close(LocalDate.now(clock));
        return views(List.of(poll), me).getFirst();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        polls.delete(managed(id, CurrentUser.get()));
    }

    private Poll visiblePoll(Long id, CurrentUser me) {
        return polls.findById(id).filter(p -> Audience.visibleTo(me.role()).contains(p.getAudience())
                        || (p.getAuthor() != null && p.getAuthor().getId().equals(me.id())))
                .orElseThrow(() -> new NotFoundException("poll", id));
    }

    private Poll managed(Long id, CurrentUser me) {
        var poll = visiblePoll(id, me);
        if (!canManage(poll, me)) {
            throw new AccessDeniedException("author-only");
        }
        return poll;
    }

    private static boolean canManage(Poll poll, CurrentUser me) {
        return me.role() == Role.ADMIN || me.role() == Role.DIRECTOR
                || (poll.getAuthor() != null && poll.getAuthor().getId().equals(me.id()));
    }

    private List<PollView> views(List<Poll> list, CurrentUser me) {
        if (list.isEmpty()) {
            return List.of();
        }
        var ids = list.stream().map(Poll::getId).toList();
        var counts = new HashMap<Long, Long>();
        votes.countByOption(ids).forEach(row -> counts.put((Long) row[1], (Long) row[2]));
        var mine = new HashMap<Long, Long>();
        votes.choicesOf(me.id(), ids).forEach(row -> mine.put((Long) row[0], (Long) row[1]));
        var today = LocalDate.now(clock);
        return list.stream().map(poll -> {
            var manage = canManage(poll, me);
            var choice = mine.get(poll.getId());
            var open = poll.isOpen(today);
            // Pas de résultats avant d'avoir répondu : on ne veut pas influencer le vote.
            var showResults = manage || choice != null || !open;
            var options = poll.getOptions().stream()
                    .map(o -> new OptionView(o.getId(), o.getLabel(), showResults ? counts.getOrDefault(o.getId(), 0L) : null))
                    .toList();
            Long total = showResults ? options.stream().mapToLong(OptionView::votes).sum() : null;
            return new PollView(poll.getId(), poll.getQuestion(), poll.getAudience(), poll.getClosesOn(), open,
                    poll.getAuthor() == null ? null : poll.getAuthor().fullName(), manage, choice, total, options);
        }).toList();
    }
}
