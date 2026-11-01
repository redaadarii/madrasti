package ma.madrasti.admission;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.common.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Pré-inscriptions : formulaire public sur le site, traitement par la direction. */
@RestController
@Transactional
public class AdmissionController {

    public record PreRegistrationRequest(@NotBlank @Size(max = 80) String childFirstName,
                                         @NotBlank @Size(max = 80) String childLastName,
                                         @NotNull @Past LocalDate birthDate, @NotBlank @Size(max = 60) String desiredLevel,
                                         @NotBlank @Size(max = 150) String parentName,
                                         @NotBlank @Email @Size(max = 150) String parentEmail,
                                         @NotBlank @Pattern(regexp = "[+0-9 ().-]{8,30}", message = "{validation.phone}") String parentPhone,
                                         @Size(max = 1000) String message) {
    }

    public record DecisionRequest(@NotNull PreRegistration.Status status) {
    }

    public record PreRegistrationResponse(Long id, String childFirstName, String childLastName, LocalDate birthDate,
                                          String desiredLevel, String parentName, String parentEmail,
                                          String parentPhone, String message, PreRegistration.Status status,
                                          Instant createdAt) {

        static PreRegistrationResponse from(PreRegistration p) {
            return new PreRegistrationResponse(p.getId(), p.getChildFirstName(), p.getChildLastName(), p.getBirthDate(),
                    p.getDesiredLevel(), p.getParentName(), p.getParentEmail(), p.getParentPhone(), p.getMessage(),
                    p.getStatus(), p.getCreatedAt());
        }
    }

    private final PreRegistrationRepository registrations;

    public AdmissionController(PreRegistrationRepository registrations) {
        this.registrations = registrations;
    }

    /** Ouvert sans authentification : seule route d'écriture publique de l'API. */
    @PostMapping("/api/public/pre-registrations")
    @ResponseStatus(HttpStatus.CREATED)
    public void submit(@Valid @RequestBody PreRegistrationRequest r) {
        registrations.save(new PreRegistration(r.childFirstName(), r.childLastName(), r.birthDate(), r.desiredLevel(),
                r.parentName(), r.parentEmail().toLowerCase(), r.parentPhone(), r.message()));
    }

    @GetMapping("/api/pre-registrations")
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public List<PreRegistrationResponse> list() {
        return registrations.findAllByOrderByCreatedAtDesc().stream().map(PreRegistrationResponse::from).toList();
    }

    @PutMapping("/api/pre-registrations/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public PreRegistrationResponse decide(@PathVariable Long id, @Valid @RequestBody DecisionRequest request) {
        var registration = registrations.findById(id).orElseThrow(() -> new NotFoundException("preRegistration", id));
        registration.decide(request.status());
        return PreRegistrationResponse.from(registration);
    }
}
