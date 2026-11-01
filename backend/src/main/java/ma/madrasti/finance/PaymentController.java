package ma.madrasti.finance;

import ma.madrasti.audit.AuditAction;
import ma.madrasti.audit.AuditService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.student.StudentAccess;
import ma.madrasti.student.StudentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/payments")
@Transactional
public class PaymentController {

    public record PaymentRequest(@NotNull Long studentId, @NotBlank String label,
                                 @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal amount,
                                 @NotNull LocalDate dueDate) {
    }

    public record PayRequest(@NotNull PaymentMethod method) {
    }

    public record PaymentResponse(Long id, Long studentId, String studentName, String classroomName, String label,
                                  BigDecimal amount, LocalDate dueDate, LocalDate paidAt, PaymentMethod method,
                                  Payment.Status status) {

        public static PaymentResponse from(Payment p, LocalDate today) {
            var s = p.getStudent();
            return new PaymentResponse(p.getId(), s.getId(), s.fullName(), s.getClassroom().getName(), p.getLabel(),
                    p.getAmount(), p.getDueDate(), p.getPaidAt(), p.getMethod(), p.status(today));
        }
    }

    private final PaymentRepository payments;
    private final StudentRepository students;
    private final StudentAccess access;
    private final Clock clock;

    private final AuditService audit;

    public PaymentController(PaymentRepository payments, StudentRepository students, StudentAccess access, Clock clock, AuditService audit) {
        this.audit = audit;
        this.payments = payments;
        this.students = students;
        this.access = access;
        this.clock = clock;
    }

    @GetMapping
    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public List<PaymentResponse> list() {
        var today = LocalDate.now(clock);
        return payments.findAllDetailed().stream().map(p -> PaymentResponse.from(p, today)).toList();
    }

    @GetMapping("/student/{studentId}")
    @Transactional(readOnly = true)
    public List<PaymentResponse> forStudent(@PathVariable Long studentId) {
        access.requireReadable(studentId);
        var today = LocalDate.now(clock);
        return payments.findByStudentIdOrderByDueDateDesc(studentId).stream()
                .map(p -> PaymentResponse.from(p, today)).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public PaymentResponse create(@Valid @RequestBody PaymentRequest request) {
        var student = students.findById(request.studentId())
                .orElseThrow(() -> new NotFoundException("student", request.studentId()));
        var payment = payments.save(new Payment(student, request.label(), request.amount(), request.dueDate()));
        return PaymentResponse.from(payment, LocalDate.now(clock));
    }

    @PutMapping("/{id}/pay")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public PaymentResponse pay(@PathVariable Long id, @Valid @RequestBody PayRequest request) {
        var payment = payments.findById(id).orElseThrow(() -> new NotFoundException("payment", id));
        var today = LocalDate.now(clock);
        payment.markPaid(today, request.method());
        audit.record(AuditAction.PAYMENT_RECORDED, payment.getStudent().fullName() + " — " + payment.getLabel(),
                payment.getAmount() + " (" + request.method() + ")");
        return PaymentResponse.from(payment, today);
    }
}
