package ma.madrasti.storage;

import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.config.MadrastiProperties;
import ma.madrasti.user.UserRepository;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Set;

/** Stockage local des fichiers (photos, supports de cours), hors de la base de données. */
@Service
public class StorageService {

    public record FileContent(StoredFile file, Resource resource) {
    }

    static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    static final Set<String> DOCUMENT_TYPES = Set.of("application/pdf", "image/jpeg", "image/png", "image/webp",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation", "audio/mpeg", "video/mp4");

    private final StoredFileRepository files;
    private final UserRepository users;
    private final Path root;

    public StorageService(StoredFileRepository files, UserRepository users, MadrastiProperties properties) {
        this.files = files;
        this.users = users;
        this.root = Path.of(properties.storage().dir()).toAbsolutePath().normalize();
    }

    @Transactional
    public StoredFile storeImage(MultipartFile upload) {
        return store(upload, IMAGE_TYPES);
    }

    @Transactional
    public StoredFile storeDocument(MultipartFile upload) {
        return store(upload, DOCUMENT_TYPES);
    }

    /** Dépôt depuis le code (données de démonstration). */
    @Transactional
    public StoredFile store(String name, String contentType, InputStream content, long size) {
        var file = files.save(new StoredFile(name, contentType, size, null));
        write(file, content);
        return file;
    }

    @Transactional(readOnly = true)
    public FileContent load(String id) {
        var file = files.findById(id).orElseThrow(() -> new NotFoundException("file", id));
        var path = root.resolve(id);
        if (!Files.exists(path)) {
            throw new NotFoundException("file", id);
        }
        return new FileContent(file, new FileSystemResource(path));
    }

    private StoredFile store(MultipartFile upload, Set<String> allowed) {
        var type = upload.getContentType();
        if (upload.isEmpty() || type == null || !allowed.contains(type)) {
            throw new ConflictException("error.file.type");
        }
        var name = upload.getOriginalFilename() == null ? "fichier" : Path.of(upload.getOriginalFilename()).getFileName().toString();
        var file = files.save(new StoredFile(name, type, upload.getSize(), users.getReferenceById(CurrentUser.get().id())));
        try (var in = upload.getInputStream()) {
            write(file, in);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return file;
    }

    private void write(StoredFile file, InputStream content) {
        try {
            Files.createDirectories(root);
            Files.copy(content, root.resolve(file.getId()), StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
}
