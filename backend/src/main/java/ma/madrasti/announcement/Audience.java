package ma.madrasti.announcement;

import ma.madrasti.user.Role;

import java.util.Set;

public enum Audience {
    ALL, PARENTS, TEACHERS, STUDENTS;

    /** Audiences qu'un rôle a le droit de lire. La direction voit tout. */
    public static Set<Audience> visibleTo(Role role) {
        return switch (role) {
            case ADMIN, DIRECTOR -> Set.of(values());
            case TEACHER -> Set.of(ALL, TEACHERS);
            case PARENT -> Set.of(ALL, PARENTS);
            case STUDENT -> Set.of(ALL, STUDENTS);
        };
    }
}
