package ma.madrasti.student;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/api/students/import")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
public class StudentImportController {

    private final StudentImportService importer;

    public StudentImportController(StudentImportService importer) {
        this.importer = importer;
    }

    /** Avec {@code dryRun=true}, le fichier est vérifié sans rien enregistrer. */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public StudentImportService.Report importStudents(@RequestParam MultipartFile file,
                                                      @RequestParam(defaultValue = "false") boolean dryRun) throws IOException {
        try (var in = file.getInputStream()) {
            return importer.importCsv(in, dryRun);
        }
    }

    @GetMapping("/template")
    public ResponseEntity<byte[]> template() {
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename("modele-import-eleves.csv").build().toString())
                .body(StudentImportService.template().getBytes(StandardCharsets.UTF_8));
    }
}
