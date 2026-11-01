package ma.madrasti.dashboard;

import ma.madrasti.admission.PreRegistration;
import ma.madrasti.admission.PreRegistrationRepository;
import ma.madrasti.attendance.AbsenceRepository;
import ma.madrasti.complaint.Complaint;
import ma.madrasti.complaint.ComplaintRepository;
import ma.madrasti.finance.PaymentRepository;
import ma.madrasti.grade.GradeRepository;
import ma.madrasti.school.ClassroomRepository;
import ma.madrasti.school.SchoolRepository;
import ma.madrasti.student.StudentRepository;
import ma.madrasti.user.Role;
import ma.madrasti.user.UserRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;

/** Indicateurs clés pour la direction (vue 360° de l'établissement). */
@RestController
@RequestMapping("/api/dashboard")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
public class DashboardController {

    public record DashboardStats(long schools, long classrooms, long students, long teachers, long parents,
                                 long absencesLast30Days, long unjustifiedAbsences, BigDecimal averageGrade,
                                 BigDecimal collected, BigDecimal outstanding, long pendingPreRegistrations,
                                 long openComplaints, long activeLoans) {
    }

    private final SchoolRepository schools;
    private final ClassroomRepository classrooms;
    private final StudentRepository students;
    private final UserRepository users;
    private final AbsenceRepository absences;
    private final GradeRepository grades;
    private final PaymentRepository payments;
    private final PreRegistrationRepository preRegistrations;
    private final ComplaintRepository complaints;
    private final ma.madrasti.library.LoanRepository loans;
    private final Clock clock;

    public DashboardController(SchoolRepository schools, ClassroomRepository classrooms, StudentRepository students,
                               UserRepository users, AbsenceRepository absences, GradeRepository grades,
                               PaymentRepository payments, PreRegistrationRepository preRegistrations,
                               ComplaintRepository complaints, ma.madrasti.library.LoanRepository loans, Clock clock) {
        this.schools = schools;
        this.classrooms = classrooms;
        this.students = students;
        this.users = users;
        this.absences = absences;
        this.grades = grades;
        this.payments = payments;
        this.preRegistrations = preRegistrations;
        this.complaints = complaints;
        this.loans = loans;
        this.clock = clock;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public DashboardStats stats() {
        var average = grades.averageOutOf20();
        return new DashboardStats(
                schools.count(),
                classrooms.count(),
                students.count(),
                users.countByRole(Role.TEACHER),
                users.countByRole(Role.PARENT),
                absences.countByDayAfter(LocalDate.now(clock).minusDays(30)),
                absences.countByJustifiedFalse(),
                average == null ? null : BigDecimal.valueOf(average).setScale(2, RoundingMode.HALF_UP),
                payments.totalCollected(),
                payments.totalOutstanding(),
                preRegistrations.countByStatus(PreRegistration.Status.PENDING),
                complaints.countByStatusNot(Complaint.Status.RESOLVED),
                loans.countByReturnedOnIsNull());
    }
}
