package ma.madrasti.expense;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findAllByOrderByOrderedOnDesc();

    List<Expense> findByPaidOnBetween(LocalDate from, LocalDate to);
}
