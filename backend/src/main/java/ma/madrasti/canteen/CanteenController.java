package ma.madrasti.canteen;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import ma.madrasti.common.NotFoundException;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/** Menus de la cantine, semaine par semaine (lundi → samedi). */
@RestController
@RequestMapping("/api/canteen")
@Transactional
public class CanteenController {

    public record MenuRequest(@Size(max = 150) String starter, @NotBlank @Size(max = 150) String mainCourse,
                              @Size(max = 150) String side, @Size(max = 150) String dessert,
                              @Size(max = 150) String vegetarian, @Size(max = 200) String allergens) {
    }

    public record MenuView(LocalDate date, String starter, String mainCourse, String side, String dessert,
                           String vegetarian, String allergens) {

        static MenuView from(CanteenMenu m) {
            return new MenuView(m.getDate(), m.getStarter(), m.getMainCourse(), m.getSide(), m.getDessert(),
                    m.getVegetarian(), m.getAllergens());
        }
    }

    public record Week(LocalDate monday, List<MenuView> menus) {
    }

    private final CanteenMenuRepository menus;
    private final Clock clock;

    public CanteenController(CanteenMenuRepository menus, Clock clock) {
        this.menus = menus;
        this.clock = clock;
    }

    /** Semaine contenant {@code date} (par défaut la semaine en cours). */
    @GetMapping
    @Transactional(readOnly = true)
    public Week week(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        var monday = (date == null ? LocalDate.now(clock) : date).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        return new Week(monday, menus.findByDateBetweenOrderByDate(monday, monday.plusDays(5)).stream().map(MenuView::from).toList());
    }

    @PutMapping("/{date}")
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public MenuView save(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                         @Valid @RequestBody MenuRequest request) {
        var menu = menus.findByDate(date).orElseGet(() -> new CanteenMenu(date));
        menu.update(clean(request.starter()), request.mainCourse().strip(), clean(request.side()), clean(request.dessert()),
                clean(request.vegetarian()), clean(request.allergens()));
        return MenuView.from(menus.save(menu));
    }

    @DeleteMapping("/{date}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('ADMIN','DIRECTOR')")
    public void delete(@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        menus.delete(menus.findByDate(date).orElseThrow(() -> new NotFoundException("menu", date)));
    }

    private static String clean(String value) {
        return value == null || value.isBlank() ? null : value.strip();
    }
}
