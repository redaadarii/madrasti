package ma.madrasti.complaint;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    @EntityGraph(attributePaths = {"author", "student"})
    @Query("select c from Complaint c order by c.createdAt desc")
    List<Complaint> findAllDetailed();

    @EntityGraph(attributePaths = {"author", "student"})
    List<Complaint> findByAuthorIdOrderByCreatedAtDesc(Long authorId);

    long countByStatusNot(Complaint.Status status);
}
