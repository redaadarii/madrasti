package ma.madrasti.sms;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SmsRepository extends JpaRepository<SmsMessage, Long> {

    List<SmsMessage> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(SmsMessage.Status status);
}
