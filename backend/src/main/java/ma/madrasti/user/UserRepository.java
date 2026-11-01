package ma.madrasti.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    long countByRole(Role role);

    List<User> findByRoleInAndActiveTrue(Collection<Role> roles);

    @EntityGraph(attributePaths = "school")
    @Query("""
            select u from User u
            where (:role is null or u.role = :role)
              and (:q is null
                   or lower(u.email) like lower(concat('%', cast(:q as string), '%'))
                   or lower(concat(u.firstName, ' ', u.lastName)) like lower(concat('%', cast(:q as string), '%')))
            """)
    Page<User> search(@Param("q") String q, @Param("role") Role role, Pageable pageable);
}
