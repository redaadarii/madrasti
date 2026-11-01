package ma.madrasti.canteen;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface CanteenMenuRepository extends JpaRepository<CanteenMenu, Long> {

    List<CanteenMenu> findByDateBetweenOrderByDate(LocalDate from, LocalDate to);

    Optional<CanteenMenu> findByDate(LocalDate date);
}
