package ma.madrasti.services;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.auth.CurrentUser;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.finance.Payment;
import ma.madrasti.finance.PaymentRepository;
import ma.madrasti.student.Student;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.user.Role;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.TextStyle;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Transport, cantine/garde et activités : catalogue, inscriptions par élève et facturation automatique. */
@RestController
@RequestMapping("/api/services")
@Transactional
public class ServicesController {

    public record ServiceRequest(@NotNull CampusService.Kind kind, @NotBlank @Size(max = 120) String name,
                                 @Size(max = 500) String description, @Size(max = 120) String schedule,
                                 @NotNull @DecimalMin("0") BigDecimal monthlyFee, @Positive Integer capacity,
                                 boolean active) {
    }

    public record SubscribeRequest(@NotNull Long studentId) {
    }

    public record ServiceResponse(Long id, CampusService.Kind kind, String name, String description, String schedule,
                                  BigDecimal monthlyFee, Integer capacity, long subscribers, boolean active,
                                  Boolean subscribed) {
    }

    public record SubscriberResponse(Long studentId, String studentName, String classroomName) {
    }

    /** L'inscription génère l'échéance du mois en cours, payable sous une semaine. */
    private static final int PAYMENT_DELAY_DAYS = 7;

    private final CampusServiceRepository services;
    private final SubscriptionRepository subscriptions;
    private final PaymentRepository payments;
    private final StudentAccess access;
    private final Clock clock;

    public ServicesController(CampusServiceRepository services, SubscriptionRepository subscriptions,
                              PaymentRepository payments, StudentAccess access, Clock clock) {
        this.services = services;
        this.subscriptions = subscriptions;
        this.payments = payments;
        this.access = access;
        this.clock = clock;
    }

    /** Avec {@code studentId}, indique pour chaque service si cet élève y est inscrit. */
    @GetMapping
    @Transactional(readOnly = true)
    public List<ServiceResponse> list(@RequestParam(required = false) Long studentId) {
        Map<Long, Long> counts = subscriptions.countPerService().stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        Set<Long> subscribed = studentId == null ? null : subscriptions.findByStudentId(access.requireReadable(studentId).getId())
                .stream().map(s -> s.getService().getId()).collect(Collectors.toSet());
        var current = CurrentUser.get();
        var manager = current.role() == Role.ADMIN || current.role() == Role.DIRECTOR;
        return services.findAllOrdered().stream()
                .filter(s -> manager || s.isActive())
                .map(s -> new ServiceResponse(s.getId(), s.getKind(), s.getName(), s.getDescription(), s.getSchedule(),
                        s.getMonthlyFee(), s.getCapacity(), counts.getOrDefault(s.getId(), 0L), s.isActive(),
                        subscribed == null ? null : subscribed.contains(s.getId())))
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public ServiceResponse create(@Valid @RequestBody ServiceRequest r) {
        var service = new CampusService(r.kind(), r.name(), r.description(), r.schedule(), r.monthlyFee(), r.capacity());
        service.setActive(r.active());
        services.save(service);
        return new ServiceResponse(service.getId(), service.getKind(), service.getName(), service.getDescription(),
                service.getSchedule(), service.getMonthlyFee(), service.getCapacity(), 0, service.isActive(), null);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public ServiceResponse update(@PathVariable Long id, @Valid @RequestBody ServiceRequest r) {
        var service = find(id);
        service.update(r.kind(), r.name(), r.description(), r.schedule(), r.monthlyFee(), r.capacity());
        service.setActive(r.active());
        return new ServiceResponse(service.getId(), service.getKind(), service.getName(), service.getDescription(),
                service.getSchedule(), service.getMonthlyFee(), service.getCapacity(),
                subscriptions.countByServiceId(id), service.isActive(), null);
    }

    @GetMapping("/{id}/subscriptions")
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public List<SubscriberResponse> subscribers(@PathVariable Long id) {
        return subscriptions.findByServiceIdOrderByStudentLastName(id).stream()
                .map(s -> new SubscriberResponse(s.getStudent().getId(), s.getStudent().fullName(),
                        s.getStudent().getClassroom().getName()))
                .toList();
    }

    @PostMapping("/{id}/subscriptions")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','PARENT')")
    public SubscriberResponse subscribe(@PathVariable Long id, @Valid @RequestBody SubscribeRequest request) {
        var service = find(id);
        var student = requireManageable(request.studentId());
        if (!service.isActive()) {
            throw new ConflictException("error.service.closed");
        }
        if (subscriptions.findByServiceIdAndStudentId(id, student.getId()).isPresent()) {
            throw new ConflictException("error.service.alreadySubscribed", student.getFirstName());
        }
        if (service.getCapacity() != null && subscriptions.countByServiceId(id) >= service.getCapacity()) {
            throw new ConflictException("error.service.full");
        }
        subscriptions.save(new Subscription(service, student));
        var today = LocalDate.now(clock);
        var month = today.getMonth().getDisplayName(TextStyle.FULL, Locale.FRENCH);
        payments.save(new Payment(student, "%s — %s".formatted(service.getName(), month), service.getMonthlyFee(),
                today.plusDays(PAYMENT_DELAY_DAYS)));
        return new SubscriberResponse(student.getId(), student.fullName(), student.getClassroom().getName());
    }

    @DeleteMapping("/{id}/subscriptions/{studentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','PARENT')")
    public void unsubscribe(@PathVariable Long id, @PathVariable Long studentId) {
        requireManageable(studentId);
        subscriptions.findByServiceIdAndStudentId(id, studentId).ifPresent(subscriptions::delete);
    }

    /** La direction gère tous les élèves ; un parent uniquement ses enfants. */
    private Student requireManageable(Long studentId) {
        var student = access.requireReadable(studentId);
        var current = CurrentUser.get();
        if (current.role() == Role.PARENT && (student.getParent() == null || !student.getParent().getId().equals(current.id()))) {
            throw new AccessDeniedException("Élève non rattaché à votre compte");
        }
        return student;
    }

    private CampusService find(Long id) {
        return services.findById(id).orElseThrow(() -> new NotFoundException("service", id));
    }
}
