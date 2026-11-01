package ma.madrasti.gallery;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.storage.StoredFile;

@Entity
@Table(name = "photos")
public class Photo extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Album album;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private StoredFile file;

    private String caption;

    protected Photo() {
    }

    public Photo(Album album, StoredFile file, String caption) {
        this.album = album;
        this.file = file;
        this.caption = caption;
    }

    public Album getAlbum() { return album; }
    public StoredFile getFile() { return file; }
    public String getCaption() { return caption; }
}
