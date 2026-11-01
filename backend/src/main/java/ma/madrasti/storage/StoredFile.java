package ma.madrasti.storage;

import jakarta.persistence.*;
import ma.madrasti.user.User;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.UUID;

/** Métadonnées d'un fichier déposé ; le contenu est sur disque, sous un identifiant aléatoire. */
@Entity
@Table(name = "stored_files")
@EntityListeners(AuditingEntityListener.class)
public class StoredFile {

    @Id
    private String id;

    @Column(nullable = false)
    private String originalName;

    @Column(nullable = false)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private long size;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by")
    private User uploadedBy;

    @CreatedDate
    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    protected StoredFile() {
    }

    StoredFile(String originalName, String contentType, long size, User uploadedBy) {
        this.id = UUID.randomUUID().toString();
        this.originalName = originalName;
        this.contentType = contentType;
        this.size = size;
        this.uploadedBy = uploadedBy;
    }

    public String getId() { return id; }
    public String getOriginalName() { return originalName; }
    public String getContentType() { return contentType; }
    public long getSize() { return size; }
}
