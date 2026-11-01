package ma.madrasti.services;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {

    long countByServiceId(Long serviceId);

    @Query("select s.service.id, count(s) from Subscription s group by s.service.id")
    List<Object[]> countPerService();

    @EntityGraph(attributePaths = "service")
    List<Subscription> findByStudentId(Long studentId);

    Optional<Subscription> findByServiceIdAndStudentId(Long serviceId, Long studentId);

    @EntityGraph(attributePaths = {"student", "student.classroom"})
    List<Subscription> findByServiceIdOrderByStudentLastName(Long serviceId);
}
