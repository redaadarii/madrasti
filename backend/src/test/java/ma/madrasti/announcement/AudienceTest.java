package ma.madrasti.announcement;

import ma.madrasti.user.Role;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

import static org.assertj.core.api.Assertions.assertThat;

class AudienceTest {

    @ParameterizedTest
    @EnumSource(Role.class)
    void everyRoleSeesGeneralAnnouncements(Role role) {
        assertThat(Audience.visibleTo(role)).contains(Audience.ALL);
    }

    @ParameterizedTest
    @EnumSource(value = Role.class, names = {"PARENT", "STUDENT"})
    void familiesDoNotSeeStaffAnnouncements(Role role) {
        assertThat(Audience.visibleTo(role)).doesNotContain(Audience.TEACHERS);
    }
}
