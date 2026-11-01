package ma.madrasti.expense;

import ma.madrasti.finance.PaymentRepository;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/** Rapport annuel : recettes encaissées et dépenses payées, mois par mois. */
@RestController
@RequestMapping("/api/finance/report")
@PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
public class FinanceReportController {

    public record MonthLine(int month, BigDecimal income, BigDecimal expenses, BigDecimal balance) {
    }

    public record FinanceReport(int year, List<MonthLine> months, BigDecimal totalIncome, BigDecimal totalExpenses,
                                BigDecimal balance, BigDecimal outstanding, Map<Expense.Category, BigDecimal> expensesByCategory) {
    }

    private final PaymentRepository payments;
    private final ExpenseRepository expenses;
    private final Clock clock;

    public FinanceReportController(PaymentRepository payments, ExpenseRepository expenses, Clock clock) {
        this.payments = payments;
        this.expenses = expenses;
        this.clock = clock;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public FinanceReport report(@RequestParam(required = false) Integer year) {
        var y = year == null ? LocalDate.now(clock).getYear() : year;
        var from = LocalDate.of(y, 1, 1);
        var to = LocalDate.of(y, 12, 31);
        var income = new BigDecimal[12];
        var spent = new BigDecimal[12];
        java.util.Arrays.fill(income, BigDecimal.ZERO);
        java.util.Arrays.fill(spent, BigDecimal.ZERO);
        Map<Expense.Category, BigDecimal> byCategory = new EnumMap<>(Expense.Category.class);

        for (var p : payments.findByPaidAtBetween(from, to)) {
            income[p.getPaidAt().getMonthValue() - 1] = income[p.getPaidAt().getMonthValue() - 1].add(p.getAmount());
        }
        for (var e : expenses.findByPaidOnBetween(from, to)) {
            spent[e.getPaidOn().getMonthValue() - 1] = spent[e.getPaidOn().getMonthValue() - 1].add(e.getAmount());
            byCategory.merge(e.getCategory(), e.getAmount(), BigDecimal::add);
        }
        var months = new ArrayList<MonthLine>();
        var totalIncome = BigDecimal.ZERO;
        var totalExpenses = BigDecimal.ZERO;
        for (var m = 0; m < 12; m++) {
            months.add(new MonthLine(m + 1, income[m], spent[m], income[m].subtract(spent[m])));
            totalIncome = totalIncome.add(income[m]);
            totalExpenses = totalExpenses.add(spent[m]);
        }
        return new FinanceReport(y, months, totalIncome, totalExpenses, totalIncome.subtract(totalExpenses),
                payments.totalOutstanding(), byCategory);
    }
}
