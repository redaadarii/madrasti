package ma.madrasti.expense;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import ma.madrasti.common.NotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
@Transactional
public class ExpenseController {

    public record ExpenseRequest(@NotBlank @Size(max = 150) String label, @NotNull Expense.Category category,
                                 @Size(max = 150) String supplier, @Size(max = 40) String reference,
                                 @NotNull @DecimalMin(value = "0", inclusive = false) BigDecimal amount,
                                 @NotNull LocalDate orderedOn) {
    }

    public record StatusRequest(@NotNull Expense.Status status) {
    }

    public record ExpenseResponse(Long id, String label, Expense.Category category, String supplier, String reference,
                                  BigDecimal amount, Expense.Status status, LocalDate orderedOn, LocalDate paidOn) {

        static ExpenseResponse from(Expense e) {
            return new ExpenseResponse(e.getId(), e.getLabel(), e.getCategory(), e.getSupplier(), e.getReference(),
                    e.getAmount(), e.getStatus(), e.getOrderedOn(), e.getPaidOn());
        }
    }

    private final ExpenseRepository expenses;
    private final Clock clock;

    public ExpenseController(ExpenseRepository expenses, Clock clock) {
        this.expenses = expenses;
        this.clock = clock;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<ExpenseResponse> list() {
        return expenses.findAllByOrderByOrderedOnDesc().stream().map(ExpenseResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ExpenseResponse create(@Valid @RequestBody ExpenseRequest r) {
        return ExpenseResponse.from(expenses.save(
                new Expense(r.label(), r.category(), r.supplier(), r.reference(), r.amount(), r.orderedOn())));
    }

    @PutMapping("/{id}")
    public ExpenseResponse update(@PathVariable Long id, @Valid @RequestBody ExpenseRequest r) {
        var expense = find(id);
        expense.update(r.label(), r.category(), r.supplier(), r.reference(), r.amount(), r.orderedOn());
        return ExpenseResponse.from(expense);
    }

    @PutMapping("/{id}/status")
    public ExpenseResponse move(@PathVariable Long id, @Valid @RequestBody StatusRequest request) {
        var expense = find(id);
        expense.moveTo(request.status(), LocalDate.now(clock));
        return ExpenseResponse.from(expense);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        expenses.delete(find(id));
    }

    private Expense find(Long id) {
        return expenses.findById(id).orElseThrow(() -> new NotFoundException("expense", id));
    }
}
