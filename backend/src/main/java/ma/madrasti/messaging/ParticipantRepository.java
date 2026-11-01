package ma.madrasti.messaging;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ParticipantRepository extends JpaRepository<Participant, Long> {

    @EntityGraph(attributePaths = "conversation")
    @Query("select p from Participant p where p.user.id = :userId order by p.conversation.lastMessageAt desc")
    List<Participant> findInbox(Long userId);

    @EntityGraph(attributePaths = "user")
    List<Participant> findByConversationIdIn(Collection<Long> conversationIds);

    @EntityGraph(attributePaths = "conversation")
    Optional<Participant> findByConversationIdAndUserId(Long conversationId, Long userId);
}
