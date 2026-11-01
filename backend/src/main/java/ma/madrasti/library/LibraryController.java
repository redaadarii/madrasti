package ma.madrasti.library;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.common.ConflictException;
import ma.madrasti.common.NotFoundException;
import ma.madrasti.student.StudentAccess;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Bibliothèque de l'école : catalogue, disponibilités et emprunts des élèves. */
@RestController
@RequestMapping("/api")
@Transactional
public class LibraryController {

    public record BookRequest(@NotBlank @Size(max = 200) String title, @NotBlank @Size(max = 150) String author,
                              @Size(max = 20) String isbn, @NotBlank @Size(max = 60) String category,
                              @Min(1) @Max(500) int copies) {
    }

    public record BookResponse(Long id, String title, String author, String isbn, String category, int copies,
                               long available) {
    }

    public record LoanRequest(@NotNull Long bookId, @NotNull Long studentId, @Min(1) @Max(60) int days) {
    }

    public record LoanResponse(Long id, Long bookId, String bookTitle, Long studentId, String studentName,
                               String classroomName, LocalDate borrowedOn, LocalDate dueOn, LocalDate returnedOn,
                               Loan.Status status) {

        static LoanResponse from(Loan l, LocalDate today) {
            var s = l.getStudent();
            return new LoanResponse(l.getId(), l.getBook().getId(), l.getBook().getTitle(), s.getId(), s.fullName(),
                    s.getClassroom().getName(), l.getBorrowedOn(), l.getDueOn(), l.getReturnedOn(), l.status(today));
        }
    }

    private final BookRepository books;
    private final LoanRepository loans;
    private final ma.madrasti.student.StudentRepository students;
    private final StudentAccess access;
    private final Clock clock;

    public LibraryController(BookRepository books, LoanRepository loans, ma.madrasti.student.StudentRepository students,
                             StudentAccess access, Clock clock) {
        this.books = books;
        this.loans = loans;
        this.students = students;
        this.access = access;
        this.clock = clock;
    }

    @GetMapping("/books")
    @Transactional(readOnly = true)
    public List<BookResponse> catalog(@RequestParam(required = false) String q) {
        Map<Long, Long> borrowed = loans.activeCountPerBook().stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        return books.search(StringUtils.hasText(q) ? q.trim() : null).stream()
                .map(b -> response(b, borrowed.getOrDefault(b.getId(), 0L)))
                .toList();
    }

    @PostMapping("/books")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public BookResponse addBook(@Valid @RequestBody BookRequest r) {
        return response(books.save(new Book(r.title(), r.author(), r.isbn(), r.category(), r.copies())), 0);
    }

    @PutMapping("/books/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public BookResponse updateBook(@PathVariable Long id, @Valid @RequestBody BookRequest r) {
        var book = findBook(id);
        var borrowed = loans.activeCount(id);
        if (r.copies() < borrowed) {
            throw new ConflictException("error.book.copiesBorrowed", borrowed);
        }
        book.update(r.title(), r.author(), r.isbn(), r.category(), r.copies());
        return response(book, borrowed);
    }

    /** Sans {@code studentId} : tous les emprunts en cours (personnel uniquement). */
    @GetMapping("/loans")
    @Transactional(readOnly = true)
    public List<LoanResponse> loans(@RequestParam(required = false) Long studentId) {
        var today = LocalDate.now(clock);
        if (studentId != null) {
            access.requireReadable(studentId);
            return loans.findByStudentIdOrderByBorrowedOnDesc(studentId).stream().map(l -> LoanResponse.from(l, today)).toList();
        }
        if (!ma.madrasti.auth.CurrentUser.get().isStaff()) {
            throw new org.springframework.security.access.AccessDeniedException("Paramètre studentId requis");
        }
        return loans.findActive().stream().map(l -> LoanResponse.from(l, today)).toList();
    }

    @PostMapping("/loans")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public LoanResponse lend(@Valid @RequestBody LoanRequest request) {
        var book = findBook(request.bookId());
        if (loans.activeCount(book.getId()) >= book.getCopies()) {
            throw new ConflictException("error.book.unavailable");
        }
        var student = students.findById(request.studentId())
                .orElseThrow(() -> new NotFoundException("student", request.studentId()));
        var today = LocalDate.now(clock);
        return LoanResponse.from(loans.save(new Loan(book, student, today, today.plusDays(request.days()))), today);
    }

    @PutMapping("/loans/{id}/return")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR','TEACHER')")
    public LoanResponse giveBack(@PathVariable Long id) {
        var loan = loans.findById(id).orElseThrow(() -> new NotFoundException("loan", id));
        var today = LocalDate.now(clock);
        loan.giveBack(today);
        return LoanResponse.from(loan, today);
    }

    private static BookResponse response(Book b, long borrowed) {
        return new BookResponse(b.getId(), b.getTitle(), b.getAuthor(), b.getIsbn(), b.getCategory(), b.getCopies(),
                Math.max(0, b.getCopies() - borrowed));
    }

    private Book findBook(Long id) {
        return books.findById(id).orElseThrow(() -> new NotFoundException("book", id));
    }
}
