package ma.madrasti.course;

import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.notification.NotificationService;
import ma.madrasti.notification.NotificationType;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.storage.StorageService;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

/** Cours en ligne : supports déposés par les enseignants pour leurs classes. */
@RestController
@RequestMapping("/api/resources")
@Transactional
public class CourseResourceController {

    public record ResourceView(Long id, Long classroomId, String classroomName, Long teacherId, String teacherName,
                               String subject, String title, String description, CourseResource.Kind kind, String url,
                               String fileId, String fileName, Instant createdAt) {

        static ResourceView from(CourseResource r) {
            var file = r.getFile();
            return new ResourceView(r.getId(), r.getClassroom().getId(), r.getClassroom().getName(), r.getTeacher().getId(),
                    r.getTeacher().fullName(), r.getSubject(), r.getTitle(), r.getDescription(), r.getKind(), r.getUrl(),
                    file == null ? null : file.getId(), file == null ? null : file.getOriginalName(), r.getCreatedAt());
        }
    }

    private final CourseResourceRepository resources;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final StudentAccess access;
    private final StorageService storage;
    private final NotificationService notifier;

    public CourseResourceController(CourseResourceRepository resources, ClassroomRepository classrooms, UserRepository users,
                                    StudentAccess access, StorageService storage, NotificationService notifier) {
        this.resources = resources;
        this.classrooms = classrooms;
        this.users = users;
        this.access = access;
        this.storage = storage;
        this.notifier = notifier;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ResourceView> list(@RequestParam(required = false) Long classroomId) {
        var visible = access.visibleClassroomIds();
        var list = visible == null ? resources.findForClassroom(classroomId)
                : resources.findForClassrooms(visible.isEmpty() ? Set.of(-1L) : visible);
        return list.stream().map(ResourceView::from).toList();
    }

    /** Fichier (PDF, Word, PowerPoint, image, audio, vidéo MP4) ou lien https:// selon {@code kind}. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public ResourceView create(@RequestParam Long classroomId, @RequestParam String subject, @RequestParam String title,
                               @RequestParam(required = false) String description, @RequestParam CourseResource.Kind kind,
                               @RequestParam(required = false) String url,
                               @RequestPart(name = "file", required = false) MultipartFile file) {
        if (title.isBlank() || subject.isBlank() || title.length() > 150) {
            throw new ConflictException("error.resource.invalid");
        }
        var classroom = classrooms.findById(classroomId).orElseThrow(() -> new NotFoundException("classroom", classroomId));
        var stored = kind == CourseResource.Kind.FILE ? storage.storeDocument(requireFile(file)) : null;
        if (kind != CourseResource.Kind.FILE && (url == null || !url.startsWith("https://"))) {
            throw new ConflictException("error.resource.url");
        }
        var resource = resources.save(new CourseResource(classroom, users.getReferenceById(CurrentUser.get().id()),
                subject.trim(), title.trim(), description, kind, kind == CourseResource.Kind.FILE ? null : url.trim(), stored));
        notifier.notify(notifier.classroom(classroomId, false), NotificationType.RESOURCE, "/courses",
                Map.of("title", resource.getTitle(), "subject", resource.getSubject()));
        return ResourceView.from(resource);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public void delete(@PathVariable Long id) {
        var resource = resources.findById(id).orElseThrow(() -> new NotFoundException("resource", id));
        var current = CurrentUser.get();
        if (current.role() == Role.TEACHER && !resource.getTeacher().getId().equals(current.id())) {
            throw new AccessDeniedException("author-only");
        }
        resources.delete(resource);
    }

    private static MultipartFile requireFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ConflictException("error.resource.file");
        }
        return file;
    }
}
