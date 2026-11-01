package ma.madrasti.export;

import ma.madrasti.common.NotFoundException;
import ma.madrasti.report.ClassAverages;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.student.Student;
import ma.madrasti.student.StudentRepository;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Comparator;
import java.util.Locale;

/**
 * Export des moyennes d'une matière au format colonnes attendu par l'import de notes MASSAR
 * (code élève, nom, prénom, note sur 20 avec virgule décimale). Le fichier est en UTF-8 avec BOM
 * pour s'ouvrir directement dans Excel avant collage dans le modèle MASSAR de la classe.
 */
@RestController
@RequestMapping("/api/exports/massar")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
public class MassarExportController {

    private final ClassAverages averages;
    private final StudentRepository students;
    private final ClassroomRepository classrooms;

    public MassarExportController(ClassAverages averages, StudentRepository students, ClassroomRepository classrooms) {
        this.averages = averages;
        this.students = students;
        this.classrooms = classrooms;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> export(@RequestParam Long classroomId, @RequestParam String term, @RequestParam String subject) {
        var classroom = classrooms.findById(classroomId).orElseThrow(() -> new NotFoundException("classroom", classroomId));
        var computed = averages.compute(classroomId, term);
        var csv = new StringBuilder("﻿CodeMassar;Nom;Prenom;Note\r\n");
        students.findByClassroomId(classroomId).stream()
                .sorted(Comparator.comparing(Student::getLastName).thenComparing(Student::getFirstName))
                .forEach(student -> {
                    var avg = computed.get(student.getId());
                    var note = avg == null ? null : avg.subjects().get(subject);
                    csv.append(code(student)).append(';').append(clean(student.getLastName())).append(';')
                            .append(clean(student.getFirstName())).append(';')
                            .append(note == null ? "" : String.format(Locale.FRANCE, "%.2f", note)).append("\r\n");
                });
        var filename = "massar-%s-%s-%s.csv".formatted(classroom.getName(), term, subject).replaceAll("[^\\w.-]", "_");
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    private static String code(Student s) {
        return s.getMassarCode() != null ? s.getMassarCode() : s.getRegistrationNumber();
    }

    private static String clean(String value) {
        return value.replace(';', ' ');
    }
}
