package ma.madrasti.library;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {

    @Query("select l.book.id, count(l) from Loan l where l.returnedOn is null group by l.book.id")
    List<Object[]> activeCountPerBook();

    @Query("select count(l) from Loan l where l.book.id = :bookId and l.returnedOn is null")
    long activeCount(@Param("bookId") Long bookId);

    @EntityGraph(attributePaths = {"book", "student", "student.classroom"})
    @Query("select l from Loan l where l.returnedOn is null order by l.dueOn")
    List<Loan> findActive();

    @EntityGraph(attributePaths = {"book", "student", "student.classroom"})
    List<Loan> findByStudentIdOrderByBorrowedOnDesc(Long studentId);

    long countByReturnedOnIsNull();
}
