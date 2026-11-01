package ma.madrasti.config;

import ma.madrasti.canteen.CanteenMenu;
import ma.madrasti.canteen.CanteenMenuRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBooleanProperty;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

/** Données de démonstration : menus de la cantine pour la semaine en cours et la suivante. */
@Component
@Order(5)
@ConditionalOnBooleanProperty("madrasti.seed-demo-data")
public class CanteenDemoSeeder implements ApplicationRunner {

    private final CanteenMenuRepository menus;
    private final Clock clock;
    private final SeedLock seedLock;

    public CanteenDemoSeeder(CanteenMenuRepository menus, Clock clock, SeedLock seedLock) {
        this.seedLock = seedLock;
        this.menus = menus;
        this.clock = clock;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seedLock.acquire();
        if (menus.count() > 0) {
            return;
        }
        // entrée, plat, accompagnement, dessert, option végétarienne, allergènes
        var week = List.of(
                new String[]{"Salade marocaine", "Tajine de poulet aux olives", "Pain complet", "Orange", "Tajine de légumes", "Gluten"},
                new String[]{"Harira", "Poisson pané", "Riz aux petits légumes", "Yaourt", "Omelette aux herbes", "Poisson, lait, gluten"},
                new String[]{"Carottes râpées au cumin", "Couscous aux sept légumes", null, "Banane", "Couscous aux légumes", "Gluten, céleri"},
                new String[]{"Zaalouk", "Kefta de bœuf sauce tomate", "Pâtes", "Compote de pommes", "Boulettes de lentilles", "Gluten"},
                new String[]{"Soupe de légumes", "Pastilla au poulet", "Salade verte", "Fruit de saison", "Pastilla aux légumes", "Gluten, œuf, fruits à coque"});
        var monday = LocalDate.now(clock).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        for (var w = 0; w < 2; w++) {
            for (var d = 0; d < week.size(); d++) {
                var m = week.get((d + w * 2) % week.size());
                var menu = new CanteenMenu(monday.plusWeeks(w).plusDays(d));
                menu.update(m[0], m[1], m[2], m[3], m[4], m[5]);
                menus.save(menu);
            }
        }
    }
}
