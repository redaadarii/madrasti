package ma.madrasti.student;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;

import java.time.LocalDate;

public final class StudentDtos {

    private StudentDtos() {
    }

    public record StudentRequest(@NotBlank String registrationNumber, @NotBlank String firstName,
                                 @NotBlank String lastName, @Past LocalDate birthDate,
                                 @NotNull Long classroomId, Long parentId, Long accountId,
                                 @jakarta.validation.constraints.Pattern(regexp = "[A-Z][0-9]{9}", message = "{validation.massar}") String massarCode) {
    }

    public record StudentResponse(Long id, String registrationNumber, String firstName, String lastName,
                                  LocalDate birthDate, String massarCode, Long classroomId, String classroomName, String schoolName,
                                  Long parentId, String parentName, Long accountId, String accountEmail) {

        public static StudentResponse from(Student student) {
            var parent = student.getParent();
            var account = student.getAccount();
            var classroom = student.getClassroom();
            return new StudentResponse(student.getId(), student.getRegistrationNumber(), student.getFirstName(),
                    student.getLastName(), student.getBirthDate(), student.getMassarCode(), classroom.getId(), classroom.getName(),
                    classroom.getSchool().getName(), parent == null ? null : parent.getId(),
                    parent == null ? null : parent.fullName(), account == null ? null : account.getId(),
                    account == null ? null : account.getEmail());
        }
    }
}
