package ma.madrasti.sms;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/sms")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
public class SmsController {

    public record BroadcastRequest(@NotNull SmsService.Audience audience, Long classroomId,
                                   @NotBlank @Size(max = 480) String message) {

        @AssertTrue(message = "{validation.sms.classroom}")
        public boolean isClassroomProvided() {
            return audience != SmsService.Audience.CLASS_PARENTS || classroomId != null;
        }
    }

    public record SmsView(Long id, String toPhone, String recipientName, String body, SmsMessage.Status status,
                          Instant createdAt) {
    }

    private final SmsService sms;

    public SmsController(SmsService sms) {
        this.sms = sms;
    }

    @PostMapping("/broadcast")
    public SmsService.BroadcastResult broadcast(@Valid @RequestBody BroadcastRequest request) {
        return sms.broadcast(request.audience(), request.classroomId(), request.message());
    }

    @GetMapping
    public List<SmsView> history() {
        return sms.recent().stream()
                .map(m -> new SmsView(m.getId(), m.getToPhone(), m.getRecipientName(), m.getBody(), m.getStatus(), m.getCreatedAt()))
                .toList();
    }
}
