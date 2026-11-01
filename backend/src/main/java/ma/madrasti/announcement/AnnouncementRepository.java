package ma.madrasti.announcement;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;

public interface AnnouncementRepository extends JpaRepository<Announcement, Long> {

    @EntityGraph(attributePaths = "author")
    @Query("select a from Announcement a where a.audience in :audiences order by a.pinned desc, a.createdAt desc")
    List<Announcement> findVisible(Collection<Audience> audiences, Pageable pageable);
}
