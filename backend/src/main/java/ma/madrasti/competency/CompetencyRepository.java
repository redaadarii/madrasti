package ma.madrasti.competency;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CompetencyRepository extends JpaRepository<Competency, Long> {

    List<Competency> findAllByOrderBySubjectAscIdAsc();
}
