package ma.madrasti.certificate;

import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

/** Attestation de scolarité au format PDF, téléchargeable par la famille sans passer au secrétariat. */
@RestController
public class CertificateController {

    private final StudentAccess access;
    private final UserRepository users;
    private final CertificatePdf pdf;
    private final Clock clock;

    public CertificateController(StudentAccess access, UserRepository users, CertificatePdf pdf, Clock clock) {
        this.access = access;
        this.users = users;
        this.pdf = pdf;
        this.clock = clock;
    }

    @GetMapping("/api/students/{id}/certificate")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> certificate(@PathVariable Long id) {
        var student = access.requireReadable(id);
        var classroom = student.getClassroom();
        var school = classroom.getSchool();
        var director = users.findByRoleInAndActiveTrue(List.of(Role.DIRECTOR)).stream().findFirst()
                .map(u -> u.fullName()).orElse(null);
        var today = LocalDate.now(clock);
        var data = new CertificatePdf.Data(school.getName(), school.getCity(), school.getAddress(), director,
                student.fullName(), student.getBirthDate(), student.getRegistrationNumber(), student.getMassarCode(),
                classroom.getName(), classroom.getLevel(), classroom.getAcademicYear(), today,
                "ATT-%d-%05d".formatted(today.getYear(), student.getId()));
        var filename = "attestation-scolarite-" + student.getLastName().toLowerCase() + "-" + student.getFirstName().toLowerCase() + ".pdf";
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(pdf.render(data));
    }
}
