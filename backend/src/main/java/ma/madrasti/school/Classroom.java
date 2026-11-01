package ma.madrasti.school;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.user.User;

@Entity
@Table(name = "classrooms")
public class Classroom extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private School school;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String level;

    @Column(nullable = false)
    private String academicYear;

    @ManyToOne(fetch = FetchType.LAZY)
    private User mainTeacher;

    protected Classroom() {
    }

    public Classroom(School school, String name, String level, String academicYear) {
        this.school = school;
        this.name = name;
        this.level = level;
        this.academicYear = academicYear;
    }

    public School getSchool() { return school; }
    public void setSchool(School school) { this.school = school; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getLevel() { return level; }
    public void setLevel(String level) { this.level = level; }
    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
    public User getMainTeacher() { return mainTeacher; }
    public void setMainTeacher(User mainTeacher) { this.mainTeacher = mainTeacher; }
}
