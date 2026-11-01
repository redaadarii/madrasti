package ma.madrasti.messaging;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import ma.madrasti.messaging.MessagingService.Contact;
import ma.madrasti.messaging.MessagingService.ConversationSummary;
import ma.madrasti.messaging.MessagingService.MessageView;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/conversations")
public class MessagingController {

    public record StartRequest(@NotEmpty @Size(max = 20) Set<Long> recipientIds, @NotBlank @Size(max = 150) String subject,
                               @NotBlank @Size(max = 5000) String body) {
    }

    public record ReplyRequest(@NotBlank @Size(max = 5000) String body) {
    }

    private final MessagingService messaging;

    public MessagingController(MessagingService messaging) {
        this.messaging = messaging;
    }

    @GetMapping
    public List<ConversationSummary> inbox() {
        return messaging.inbox();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("count", messaging.unreadCount());
    }

    @GetMapping("/contacts")
    public List<Contact> contacts(@RequestParam(required = false) String q) {
        return messaging.contacts(q);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConversationSummary start(@Valid @RequestBody StartRequest request) {
        return messaging.start(request.recipientIds(), request.subject(), request.body());
    }

    @GetMapping("/{id}/messages")
    public List<MessageView> read(@PathVariable Long id) {
        return messaging.read(id);
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public MessageView reply(@PathVariable Long id, @Valid @RequestBody ReplyRequest request) {
        return messaging.reply(id, request.body());
    }
}
