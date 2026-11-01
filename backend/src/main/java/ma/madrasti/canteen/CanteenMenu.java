package ma.madrasti.canteen;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;

import java.time.LocalDate;

/** Menu du jour de la cantine, publié par la direction et consultable par les familles. */
@Entity
@Table(name = "canteen_menus")
public class CanteenMenu extends BaseEntity {

    @Column(name = "menu_date", nullable = false, unique = true)
    private LocalDate date;

    private String starter;

    @Column(nullable = false)
    private String mainCourse;

    private String side;

    private String dessert;

    /** Plat de remplacement sans viande. */
    private String vegetarian;

    private String allergens;

    protected CanteenMenu() {
    }

    public CanteenMenu(LocalDate date) {
        this.date = date;
    }

    public void update(String starter, String mainCourse, String side, String dessert, String vegetarian, String allergens) {
        this.starter = starter;
        this.mainCourse = mainCourse;
        this.side = side;
        this.dessert = dessert;
        this.vegetarian = vegetarian;
        this.allergens = allergens;
    }

    public LocalDate getDate() { return date; }
    public String getStarter() { return starter; }
    public String getMainCourse() { return mainCourse; }
    public String getSide() { return side; }
    public String getDessert() { return dessert; }
    public String getVegetarian() { return vegetarian; }
    public String getAllergens() { return allergens; }
}
