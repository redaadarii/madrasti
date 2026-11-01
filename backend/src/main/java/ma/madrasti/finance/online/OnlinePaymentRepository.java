package ma.madrasti.finance.online;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OnlinePaymentRepository extends JpaRepository<OnlinePayment, Long> {

    @EntityGraph(attributePaths = {"payment", "payment.student", "payment.student.classroom", "payer"})
    Optional<OnlinePayment> findBySessionId(String sessionId);

    /**
     * Verrou de ligne pendant la confirmation : deux retours simultanés (double clic, rechargement)
     * sont traités l'un après l'autre et l'échéance n'est marquée payée qu'une fois.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from OnlinePayment o where o.sessionId = :sessionId")
    Optional<OnlinePayment> lockBySessionId(@Param("sessionId") String sessionId);
}
