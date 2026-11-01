package ma.madrasti.school;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public final class SchoolDtos {

    private SchoolDtos() {
    }

    public record SchoolRequest(@NotBlank String name, @NotBlank String city, String address, String phone,
                                @Email String email) {
    }

    public record SchoolResponse(Long id, String name, String city, String address, String phone, String email) {

        public static SchoolResponse from(School school) {
            return new SchoolResponse(school.getId(), school.getName(), school.getCity(), school.getAddress(),
                    school.getPhone(), school.getEmail());
        }
    }

    public record ClassroomRequest(@NotNull Long schoolId, @NotBlank String name, @NotBlank String level,
                                   @NotBlank @Pattern(regexp = "\\d{4}-\\d{4}", message = "{validation.academicYear}")
                                   String academicYear,
                                   Long mainTeacherId) {
    }

    public record ClassroomResponse(Long id, Long schoolId, String schoolName, String name, String level,
                                    String academicYear, Long mainTeacherId, String mainTeacherName,
                                    long studentCount) {

        public static ClassroomResponse from(Classroom classroom, long studentCount) {
            var teacher = classroom.getMainTeacher();
            return new ClassroomResponse(classroom.getId(), classroom.getSchool().getId(),
                    classroom.getSchool().getName(), classroom.getName(), classroom.getLevel(),
                    classroom.getAcademicYear(), teacher == null ? null : teacher.getId(),
                    teacher == null ? null : teacher.fullName(), studentCount);
        }
    }
}
