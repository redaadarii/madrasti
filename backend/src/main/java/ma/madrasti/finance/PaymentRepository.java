package ma.madrasti.finance;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    @EntityGraph(attributePaths = {"student", "student.classroom"})
    @Query("select p from Payment p order by p.dueDate desc")
    List<Payment> findAllDetailed();

    @EntityGraph(attributePaths = {"student", "student.classroom"})
    List<Payment> findByStudentIdOrderByDueDateDesc(Long studentId);

    List<Payment> findByPaidAtBetween(java.time.LocalDate from, java.time.LocalDate to);

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.paidAt is not null")
    BigDecimal totalCollected();

    @Query("select coalesce(sum(p.amount), 0) from Payment p where p.paidAt is null")
    BigDecimal totalOutstanding();
}
