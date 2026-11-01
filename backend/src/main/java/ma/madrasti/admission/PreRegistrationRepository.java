package ma.madrasti.admission;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PreRegistrationRepository extends JpaRepository<PreRegistration, Long> {

    List<PreRegistration> findAllByOrderByCreatedAtDesc();

    long countByStatus(PreRegistration.Status status);
}
