package ma.madrasti.audit;

import ma.madrasti.common.PageResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;

@RestController
@RequestMapping("/api/admin/audit")
@PreAuthorize("hasRole('ADMIN')")
public class AuditController {

    public record AuditView(Long id, AuditAction action, String actorEmail, String target, String detail, String ip,
                            Instant createdAt) {
        static AuditView from(AuditEvent e) {
            return new AuditView(e.getId(), e.getAction(), e.getActorEmail(), e.getTarget(), e.getDetail(), e.getIp(), e.getCreatedAt());
        }
    }

    private final AuditEventRepository events;

    public AuditController(AuditEventRepository events) {
        this.events = events;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public PageResponse<AuditView> search(@RequestParam(required = false) AuditAction action,
                                          @RequestParam(required = false) String q,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "50") int size) {
        var query = q == null || q.isBlank() ? null : q.trim();
        return PageResponse.of(events.search(action, query, PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 200))),
                AuditView::from);
    }
}
