package ma.madrasti.gallery;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface AlbumRepository extends JpaRepository<Album, Long> {

    @EntityGraph(attributePaths = {"classroom", "author", "photos", "photos.file"})
    @Query("select a from Album a order by a.createdAt desc")
    List<Album> findAllDetailed();

    @EntityGraph(attributePaths = {"classroom", "author", "photos", "photos.file"})
    @Query("select a from Album a where a.classroom is null or a.classroom.id in :ids order by a.createdAt desc")
    List<Album> findVisible(@Param("ids") Collection<Long> classroomIds);
}
