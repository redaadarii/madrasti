package ma.madrasti.storage;

import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** Téléchargement authentifié ; l'identifiant (UUID) n'est connu que des pages qui référencent le fichier. */
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final StorageService storage;

    public FileController(StorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Resource> download(@PathVariable String id) {
        var content = storage.load(id);
        var file = content.file();
        var disposition = file.getContentType().startsWith("image/") ? ContentDisposition.inline() : ContentDisposition.attachment();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .contentLength(file.getSize())
                .cacheControl(CacheControl.maxAge(Duration.ofDays(7)).cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition.filename(file.getOriginalName(), StandardCharsets.UTF_8).build().toString())
                .body(content.resource());
    }
}
