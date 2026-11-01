package ma.madrasti;

import com.jayway.jsonpath.JsonPath;
import ma.madrasti.config.DemoDataSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class StudentSpaceIntegrationTest {

    private static final String ADAM = "adam.adari@eleve.madrasti.ma";

    @Autowired
    MockMvc mvc;

    @Test
    void studentSeesOwnProfileAndGradesButNotOthers() throws Exception {
        var adam = token(ADAM);

        var body = mvc.perform(get("/api/students/me").header("Authorization", bearer(adam)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Adam"))
                .andExpect(jsonPath("$.accountEmail").value(ADAM))
                .andReturn().getResponse().getContentAsString();
        Integer ownId = JsonPath.read(body, "$.id");

        mvc.perform(get("/api/grades").param("studentId", ownId.toString()).header("Authorization", bearer(adam)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/grades").param("studentId", String.valueOf(ownId + 1)).header("Authorization", bearer(adam)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/students").header("Authorization", bearer(adam)))
                .andExpect(status().isForbidden());
    }

    @Test
    void homeworkIsSubmittedReviewedThenLocked() throws Exception {
        var adam = token(ADAM);
        var assignments = mvc.perform(get("/api/assignments").header("Authorization", bearer(adam)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        List<String> classrooms = JsonPath.read(assignments, "$[*].classroomName");
        assertThat(classrooms).isNotEmpty().containsOnly(classrooms.getFirst());
        List<Integer> scienceIds = JsonPath.read(assignments, "$[?(@.subject == 'Sciences')].id");
        var exposeId = scienceIds.getFirst();

        mvc.perform(put("/api/assignments/{id}/submission", exposeId).header("Authorization", bearer(adam))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Évaporation, condensation, précipitations.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.late").value(false));

        var teacher = token("prof.math@madrasti.ma");
        var copies = mvc.perform(get("/api/assignments/{id}/submissions", exposeId).header("Authorization", bearer(teacher)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].studentName").value("Adam Adari"))
                .andReturn().getResponse().getContentAsString();
        Integer copyId = JsonPath.read(copies, "$[0].id");

        mvc.perform(put("/api/submissions/{id}/review", copyId).header("Authorization", bearer(teacher))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"score\":15.5,\"feedback\":\"Bien, ajoute un schéma.\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/assignments").header("Authorization", bearer(adam)))
                .andExpect(jsonPath("$[?(@.id == %d)].submission.score".formatted(exposeId)).value(15.5));
        mvc.perform(put("/api/assignments/{id}/submission", exposeId).header("Authorization", bearer(adam))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"nouvelle version\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void parentMustTargetOneOfTheirChildren() throws Exception {
        mvc.perform(get("/api/assignments").header("Authorization", bearer(token("parent.adari@madrasti.ma"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void liveSessionsAreScopedToTheClassAndJitsiRoomsAreGenerated() throws Exception {
        mvc.perform(get("/api/live-sessions").header("Authorization", bearer(token(ADAM))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].classroomName", everyItem(org.hamcrest.Matchers.is("CM1-B"))));

        var teacher = token("prof.francais@madrasti.ma");
        var startsAt = Instant.now().plus(2, ChronoUnit.DAYS);
        mvc.perform(post("/api/live-sessions").header("Authorization", bearer(teacher))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"classroomId":1,"subject":"Français","title":"Dictée","startsAt":"%s",
                                 "durationMinutes":45,"provider":"JITSI"}""".formatted(startsAt)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.meetingUrl", startsWith("https://meet.jit.si/Madrasti-")))
                .andExpect(jsonPath("$.status").value("UPCOMING"));

        mvc.perform(post("/api/live-sessions").header("Authorization", bearer(teacher))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"classroomId":1,"subject":"Français","title":"Dictée","startsAt":"%s",
                                 "durationMinutes":45,"provider":"EXTERNAL"}""".formatted(startsAt)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.externalUrlPresent").exists());
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }

    private String token(String email) throws Exception {
        var body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, DemoDataSeeder.DEMO_PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }
}
