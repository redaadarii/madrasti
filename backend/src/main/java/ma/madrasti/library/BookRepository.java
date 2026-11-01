package ma.madrasti.library;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookRepository extends JpaRepository<Book, Long> {

    @Query("""
            select b from Book b
            where :q is null
               or lower(b.title) like lower(concat('%', cast(:q as string), '%'))
               or lower(b.author) like lower(concat('%', cast(:q as string), '%'))
               or lower(b.category) like lower(concat('%', cast(:q as string), '%'))
            order by b.title
            """)
    List<Book> search(@Param("q") String q);
}
