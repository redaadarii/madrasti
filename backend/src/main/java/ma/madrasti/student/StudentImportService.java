package ma.madrasti.student;

import ma.madrasti.audit.AuditAction;
import ma.madrasti.audit.AuditService;

import ma.madrasti.school.Classroom;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.user.Role;
import ma.madrasti.user.User;
import ma.madrasti.user.UserRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

import java.io.IOException;
import java.io.InputStream;
import java.io.PushbackInputStream;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Import en masse des élèves (rentrée, migration depuis un autre logiciel) à partir d'un CSV.
 * Tout ou rien : à la moindre erreur, ou en simulation, rien n'est enregistré et le rapport liste les lignes à corriger.
 * Les comptes parents manquants sont créés (mot de passe aléatoire, à réinitialiser depuis « Comptes »).
 */
@Service
public class StudentImportService {

    public static final List<String> COLUMNS = List.of("matricule", "prenom", "nom", "date_naissance", "classe",
            "code_massar", "email_parent", "prenom_parent", "nom_parent", "telephone_parent");
    private static final Set<String> REQUIRED = Set.of("matricule", "prenom", "nom", "classe");
    private static final Pattern MASSAR = Pattern.compile("[A-Z][0-9]{9}");
    private static final Pattern EMAIL = Pattern.compile("[^@\\s]+@[^@\\s]+\\.[^@\\s]+");
    private static final List<DateTimeFormatter> DATES = List.of(DateTimeFormatter.ISO_LOCAL_DATE, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    private static final int MAX_ROWS = 2_000;

    public record LineError(long line, String message) {
    }

    public record Report(boolean dryRun, int rows, int studentsCreated, int parentsCreated, int parentsLinked,
                         List<LineError> errors) {
    }

    private final StudentRepository students;
    private final ClassroomRepository classrooms;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final MessageSource messages;
    private final SecureRandom random = new SecureRandom();

    private final AuditService audit;

    public StudentImportService(StudentRepository students, ClassroomRepository classrooms, UserRepository users,
                                PasswordEncoder passwordEncoder, MessageSource messages, AuditService audit) {
        this.audit = audit;
        this.students = students;
        this.classrooms = classrooms;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.messages = messages;
    }

    @Transactional
    public Report importCsv(InputStream input, boolean dryRun) throws IOException {
        var content = new String(skipBom(input).readAllBytes(), StandardCharsets.UTF_8);
        var firstLine = content.lines().findFirst().orElse("");
        var delimiter = firstLine.chars().filter(c -> c == ';').count() >= firstLine.chars().filter(c -> c == ',').count() ? ';' : ',';
        var format = CSVFormat.DEFAULT.builder().setDelimiter(delimiter).setHeader().setSkipHeaderRecord(true)
                .setIgnoreEmptyLines(true).setTrim(true).get();

        var errors = new ArrayList<LineError>();
        try (var parser = format.parse(new java.io.StringReader(content))) {
            var header = parser.getHeaderNames().stream().map(h -> h.toLowerCase(Locale.ROOT).strip()).toList();
            var missing = REQUIRED.stream().filter(c -> !header.contains(c)).sorted().toList();
            if (!missing.isEmpty()) {
                return new Report(dryRun, 0, 0, 0, 0, List.of(new LineError(1, message("import.error.columns", String.join(", ", missing)))));
            }
            var records = parser.getRecords();
            if (records.size() > MAX_ROWS) {
                return new Report(dryRun, records.size(), 0, 0, 0, List.of(new LineError(1, message("import.error.tooMany", MAX_ROWS))));
            }
            var byName = classrooms.findAllDetailed().stream()
                    .collect(Collectors.toMap(c -> c.getName().toLowerCase(Locale.ROOT), Function.identity(), (a, b) -> a));
            var seenNumbers = new HashSet<String>();
            var newParents = new HashMap<String, User>();
            int created = 0, parentsCreated = 0, parentsLinked = 0;

            for (var record : records) {
                var line = record.getRecordNumber() + 1;
                var row = normalize(record, parser.getHeaderNames());
                var rowErrors = new ArrayList<String>();
                REQUIRED.stream().sorted().filter(c -> row.get(c) == null).forEach(c -> rowErrors.add(message("import.error.required", c)));

                var number = row.get("matricule");
                if (number != null && (!seenNumbers.add(number) || students.existsByRegistrationNumber(number))) {
                    rowErrors.add(message("import.error.duplicate", number));
                }
                Classroom classroom = row.get("classe") == null ? null : byName.get(row.get("classe").toLowerCase(Locale.ROOT));
                if (row.get("classe") != null && classroom == null) {
                    rowErrors.add(message("import.error.classroom", row.get("classe")));
                }
                var birthDate = parseDate(row.get("date_naissance"));
                if (row.get("date_naissance") != null && (birthDate == null || !birthDate.isBefore(LocalDate.now()))) {
                    rowErrors.add(message("import.error.date", row.get("date_naissance")));
                }
                var massar = row.get("code_massar") == null ? null : row.get("code_massar").toUpperCase(Locale.ROOT);
                if (massar != null && !MASSAR.matcher(massar).matches()) {
                    rowErrors.add(message("validation.massar"));
                }
                var parentEmail = row.get("email_parent") == null ? null : row.get("email_parent").toLowerCase(Locale.ROOT);
                User parent = null;
                if (parentEmail != null) {
                    if (!EMAIL.matcher(parentEmail).matches()) {
                        rowErrors.add(message("import.error.email", parentEmail));
                    } else {
                        parent = newParents.get(parentEmail);
                        if (parent == null) {
                            var existing = users.findByEmailIgnoreCase(parentEmail);
                            if (existing.isPresent() && existing.get().getRole() != Role.PARENT) {
                                rowErrors.add(message("import.error.notParent", parentEmail));
                            } else if (existing.isPresent()) {
                                parent = existing.get();
                                parentsLinked++;
                            }
                        }
                    }
                }
                if (!rowErrors.isEmpty()) {
                    rowErrors.forEach(m -> errors.add(new LineError(line, m)));
                    continue;
                }
                if (parentEmail != null && parent == null) {
                    parent = new User(parentEmail, passwordEncoder.encode(randomPassword()),
                            Optional.ofNullable(row.get("prenom_parent")).orElse("Famille"),
                            Optional.ofNullable(row.get("nom_parent")).orElse(row.get("nom")), Role.PARENT);
                    parent.setPhone(row.get("telephone_parent"));
                    parent.setSchool(classroom.getSchool());
                    parent = users.save(parent);
                    newParents.put(parentEmail, parent);
                    parentsCreated++;
                }
                var student = new Student(number, row.get("prenom"), row.get("nom"), classroom);
                student.setBirthDate(birthDate);
                student.setMassarCode(massar);
                student.setParent(parent);
                students.save(student);
                created++;
            }
            if (!dryRun && errors.isEmpty()) {
                audit.record(AuditAction.STUDENTS_IMPORTED, null,
                        created + " élève(s), " + parentsCreated + " parent(s) créé(s), " + parentsLinked + " rattaché(s)");
            }
            if (dryRun || !errors.isEmpty()) {
                // Simulation ou fichier à corriger : on annule tout ce qui a été préparé.
                TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            }
            return new Report(dryRun, records.size(), errors.isEmpty() ? created : 0, errors.isEmpty() ? parentsCreated : 0,
                    errors.isEmpty() ? parentsLinked : 0, errors);
        } catch (IllegalArgumentException | IllegalStateException | java.io.UncheckedIOException e) {
            TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
            return new Report(dryRun, 0, 0, 0, 0, List.of(new LineError(1, message("import.error.format"))));
        }
    }

    /** En-têtes insensibles à la casse et aux espaces ; cellules vides ramenées à null. */
    private static Map<String, String> normalize(CSVRecord record, List<String> headers) {
        var row = new HashMap<String, String>();
        for (var i = 0; i < headers.size() && i < record.size(); i++) {
            var value = record.get(i);
            row.put(headers.get(i).toLowerCase(Locale.ROOT).strip(), value == null || value.isBlank() ? null : value.strip());
        }
        return row;
    }

    private static LocalDate parseDate(String value) {
        if (value == null) return null;
        for (var format : DATES) {
            try {
                return LocalDate.parse(value, format);
            } catch (DateTimeParseException ignored) {
                // format suivant
            }
        }
        return null;
    }

    /** Excel enregistre souvent le CSV en UTF-8 avec BOM. */
    private static InputStream skipBom(InputStream input) throws IOException {
        var stream = new PushbackInputStream(input, 3);
        var bom = stream.readNBytes(3);
        if (!(bom.length == 3 && (bom[0] & 0xFF) == 0xEF && (bom[1] & 0xFF) == 0xBB && (bom[2] & 0xFF) == 0xBF)) {
            stream.unread(bom);
        }
        return stream;
    }

    private String randomPassword() {
        var bytes = new byte[18];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String message(String code, Object... args) {
        return messages.getMessage(code, args, LocaleContextHolder.getLocale());
    }

    /** Fichier modèle téléchargeable (séparateur « ; » pour Excel en français). */
    public static String template() {
        return "﻿" + String.join(";", COLUMNS) + "\n"
                + "SC-2026-0901;Salma;Bennani;2015-03-12;CM1-B;G123450001;famille.bennani@exemple.ma;Hind;Bennani;+212 661 000 001\n";
    }
}
