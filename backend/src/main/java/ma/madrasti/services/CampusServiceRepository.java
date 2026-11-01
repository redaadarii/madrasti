package ma.madrasti.services;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CampusServiceRepository extends JpaRepository<CampusService, Long> {

    @Query("select s from CampusService s order by s.kind, s.name")
    List<CampusService> findAllOrdered();
}
