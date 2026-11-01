package ma.madrasti.gallery;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.notification.NotificationService;
import ma.madrasti.notification.NotificationType;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.storage.StorageService;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Galerie photo de l'école : albums par classe ou pour tous. */
@RestController
@RequestMapping("/api/albums")
@Transactional
public class GalleryController {

    public record AlbumRequest(@NotBlank @Size(max = 150) String title, @Size(max = 500) String description, Long classroomId) {
    }

    public record PhotoView(Long id, String fileId, String caption) {
    }

    public record AlbumView(Long id, String title, String description, Long classroomId, String classroomName,
                            String authorName, Instant createdAt, List<PhotoView> photos) {

        static AlbumView from(Album a) {
            var classroom = a.getClassroom();
            return new AlbumView(a.getId(), a.getTitle(), a.getDescription(), classroom == null ? null : classroom.getId(),
                    classroom == null ? null : classroom.getName(), a.getAuthor().fullName(), a.getCreatedAt(),
                    a.getPhotos().stream().map(p -> new PhotoView(p.getId(), p.getFile().getId(), p.getCaption())).toList());
        }
    }

    private final AlbumRepository albums;
    private final PhotoRepository photos;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final StudentAccess access;
    private final StorageService storage;
    private final NotificationService notifier;

    public GalleryController(AlbumRepository albums, PhotoRepository photos, ClassroomRepository classrooms,
                             UserRepository users, StudentAccess access, StorageService storage, NotificationService notifier) {
        this.albums = albums;
        this.photos = photos;
        this.classrooms = classrooms;
        this.users = users;
        this.access = access;
        this.storage = storage;
        this.notifier = notifier;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<AlbumView> list() {
        var visible = access.visibleClassroomIds();
        var list = visible == null ? albums.findAllDetailed() : albums.findVisible(visible.isEmpty() ? Set.of(-1L) : visible);
        return list.stream().map(AlbumView::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public AlbumView create(@Valid @RequestBody AlbumRequest request) {
        var classroom = request.classroomId() == null ? null : classrooms.findById(request.classroomId())
                .orElseThrow(() -> new NotFoundException("classroom", request.classroomId()));
        var album = albums.save(new Album(request.title(), request.description(), classroom,
                users.getReferenceById(CurrentUser.get().id())));
        return AlbumView.from(album);
    }

    /** Ajout de photos (JPEG, PNG, WebP, GIF ; 10 Mo maximum chacune). */
    @PostMapping(path = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public AlbumView addPhotos(@PathVariable Long id, @RequestPart("files") List<MultipartFile> files,
                               @RequestParam(required = false) String caption) {
        var album = albums.findById(id).orElseThrow(() -> new NotFoundException("album", id));
        for (var upload : files) {
            album.getPhotos().add(new Photo(album, storage.storeImage(upload), caption));
        }
        var recipients = album.getClassroom() == null ? notifier.audience(ma.madrasti.announcement.Audience.ALL)
                : notifier.classroom(album.getClassroom().getId(), true);
        notifier.notify(recipients, NotificationType.PHOTOS, "/gallery",
                Map.of("title", album.getTitle(), "count", String.valueOf(files.size())));
        return AlbumView.from(albums.save(album));
    }

    @DeleteMapping("/photos/{photoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void deletePhoto(@PathVariable Long photoId) {
        var photo = photos.findById(photoId).orElseThrow(() -> new NotFoundException("photo", photoId));
        photo.getAlbum().getPhotos().remove(photo);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public void delete(@PathVariable Long id) {
        albums.delete(albums.findById(id).orElseThrow(() -> new NotFoundException("album", id)));
    }
}
