package ma.madrasti.messaging;

import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Messagerie interne. Le personnel peut écrire à tout le monde ; les familles et les élèves écrivent
 * uniquement à l'équipe de l'école (direction, enseignants, administration).
 */
@Service
@Transactional
public class MessagingService {

    public record Contact(Long id, String name, Role role) {
        static Contact from(User user) {
            return new Contact(user.getId(), user.fullName(), user.getRole());
        }
    }

    public record ConversationSummary(Long id, String subject, List<Contact> participants, Instant lastMessageAt,
                                      String lastMessagePreview, boolean unread) {
    }

    public record MessageView(Long id, Long senderId, String senderName, String body, Instant createdAt, boolean mine) {
    }

    private static final int CONTACT_LIMIT = 20;

    private final ConversationRepository conversations;
    private final ParticipantRepository participants;
    private final MessageRepository messages;
    private final UserRepository users;
    private final Clock clock;
    private final ma.madrasti.notification.NotificationService notifier;

    MessagingService(ConversationRepository conversations, ParticipantRepository participants,
                     MessageRepository messages, UserRepository users, Clock clock, ma.madrasti.notification.NotificationService notifier) {
        this.conversations = conversations;
        this.participants = participants;
        this.messages = messages;
        this.users = users;
        this.clock = clock;
        this.notifier = notifier;
    }

    @Transactional(readOnly = true)
    public List<Contact> contacts(String q) {
        var current = CurrentUser.get();
        return users.search(q == null || q.isBlank() ? null : q.trim(), null, PageRequest.of(0, 200, Sort.by("lastName")))
                .stream()
                .filter(u -> u.isActive() && !u.getId().equals(current.id()) && canContact(current, u))
                .limit(CONTACT_LIMIT)
                .map(Contact::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConversationSummary> inbox() {
        var me = CurrentUser.get().id();
        var mine = participants.findInbox(me);
        if (mine.isEmpty()) {
            return List.of();
        }
        var others = participants.findByConversationIdIn(mine.stream().map(p -> p.getConversation().getId()).toList())
                .stream()
                .filter(p -> !p.getUser().getId().equals(me))
                .collect(Collectors.groupingBy(p -> p.getConversation().getId(),
                        Collectors.mapping(p -> Contact.from(p.getUser()), Collectors.toList())));
        return mine.stream().map(p -> {
            var c = p.getConversation();
            return new ConversationSummary(c.getId(), c.getSubject(), others.getOrDefault(c.getId(), List.of()),
                    c.getLastMessageAt(), c.getLastMessagePreview(), p.hasUnread());
        }).toList();
    }

    @Transactional(readOnly = true)
    public long unreadCount() {
        return participants.findInbox(CurrentUser.get().id()).stream().filter(Participant::hasUnread).count();
    }

    public ConversationSummary start(Collection<Long> recipientIds, String subject, String body) {
        var current = CurrentUser.get();
        var recipients = new LinkedHashSet<>(users.findAllById(recipientIds));
        if (recipients.isEmpty() || recipients.size() != new LinkedHashSet<>(recipientIds).size()) {
            throw new NotFoundException("recipient", recipientIds);
        }
        for (var recipient : recipients) {
            if (recipient.getId().equals(current.id()) || !canContact(current, recipient)) {
                throw new AccessDeniedException("Vous ne pouvez pas écrire à " + recipient.fullName());
            }
        }
        var conversation = new Conversation(subject);
        conversation.touch(body, clock.instant());
        conversations.save(conversation);
        var author = participants.save(new Participant(conversation, users.getReferenceById(current.id())));
        recipients.forEach(r -> participants.save(new Participant(conversation, r)));
        post(author, body);
        return new ConversationSummary(conversation.getId(), subject, recipients.stream().map(Contact::from).toList(),
                conversation.getLastMessageAt(), conversation.getLastMessagePreview(), false);
    }

    /** Ouvrir une conversation la marque comme lue. */
    public List<MessageView> read(Long conversationId) {
        var me = membership(conversationId);
        me.markRead(clock.instant());
        var myId = me.getUser().getId();
        return messages.findByConversationIdOrderByCreatedAtAsc(conversationId).stream()
                .map(m -> new MessageView(m.getId(), m.getSender().getId(), m.getSender().fullName(), m.getBody(),
                        m.getCreatedAt(), m.getSender().getId().equals(myId)))
                .toList();
    }

    public MessageView reply(Long conversationId, String body) {
        var message = post(membership(conversationId), body);
        return new MessageView(message.getId(), message.getSender().getId(), message.getSender().fullName(),
                message.getBody(), message.getCreatedAt(), true);
    }

    private Message post(Participant author, String body) {
        var now = clock.instant();
        var conversation = author.getConversation();
        conversation.touch(body, now);
        author.markRead(now);
        var message = messages.save(new Message(conversation, author.getUser(), body));
        var others = participants.findByConversationIdIn(java.util.List.of(conversation.getId())).stream()
                .map(Participant::getUser).filter(u -> !u.getId().equals(author.getUser().getId())).toList();
        notifier.notify(others, ma.madrasti.notification.NotificationType.MESSAGE, "/messages",
                java.util.Map.of("from", author.getUser().fullName(), "subject", conversation.getSubject()));
        return message;
    }

    private Participant membership(Long conversationId) {
        return participants.findByConversationIdAndUserId(conversationId, CurrentUser.get().id())
                .orElseThrow(() -> new NotFoundException("conversation", conversationId));
    }

    private static boolean canContact(CurrentUser current, User target) {
        return current.isStaff() || target.getRole() == Role.ADMIN || target.getRole() == Role.DIRECTOR
                || target.getRole() == Role.TEACHER;
    }
}
