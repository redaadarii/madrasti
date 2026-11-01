package ma.madrasti.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class UserDtos {

    private UserDtos() {
    }

    public record UserResponse(Long id, String email, String firstName, String lastName, String phone,
                               Role role, Long schoolId, String schoolName, boolean active, String language,
                               Instant createdAt) {

        public static UserResponse from(User user) {
            var school = user.getSchool();
            return new UserResponse(user.getId(), user.getEmail(), user.getFirstName(), user.getLastName(),
                    user.getPhone(), user.getRole(), school == null ? null : school.getId(),
                    school == null ? null : school.getName(), user.isActive(), user.getLanguage(), user.getCreatedAt());
        }
    }

    public record CreateUserRequest(
            @NotBlank @Email String email,
            @NotBlank @Size(min = 8, message = "{validation.password.size}") String password,
            @NotBlank String firstName,
            @NotBlank String lastName,
            String phone,
            @NotNull Role role,
            Long schoolId) {
    }

    public record UpdateUserRequest(
            @NotBlank @Email String email,
            @NotBlank String firstName,
            @NotBlank String lastName,
            String phone,
            @NotNull Role role,
            Long schoolId,
            boolean active) {
    }

    public record ResetPasswordRequest(@NotBlank @Size(min = 8, message = "{validation.password.size}") String password) {
    }
}
