package ma.madrasti.audit;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuditEventRepository extends JpaRepository<AuditEvent, Long> {

    @Query("""
            select e from AuditEvent e
            where (:action is null or e.action = :action)
              and (:q is null
                   or lower(e.actorEmail) like lower(concat('%', cast(:q as string), '%'))
                   or lower(e.target) like lower(concat('%', cast(:q as string), '%')))
            order by e.createdAt desc, e.id desc""")
    Page<AuditEvent> search(@Param("action") AuditAction action, @Param("q") String q, Pageable pageable);
}
