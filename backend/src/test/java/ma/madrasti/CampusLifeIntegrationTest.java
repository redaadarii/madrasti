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
import org.springframework.test.web.servlet.ResultActions;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CampusLifeIntegrationTest {

    private static final String ADAM = "adam.adari@eleve.madrasti.ma";
    private static final String PARENT = "parent.adari@madrasti.ma";
    private static final String DIRECTOR = "direction@madrasti.ma";
    private static final String TEACHER = "prof.math@madrasti.ma";

    @Autowired
    MockMvc mvc;

    @Test
    void timetableIsScopedAndRejectsOverlaps() throws Exception {
        call(ADAM, get("/api/timetable"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()", greaterThan(10)))
                .andExpect(jsonPath("$[*].classroomName", everyItem(is("CM1-B"))));

        // Lundi 8h30-10h00 est déjà occupé dans toutes les classes de démo.
        send(DIRECTOR, post("/api/timetable"), """
                {"classroomId":1,"dayOfWeek":1,"startTime":"09:00","endTime":"10:00","subject":"Arabe"}""")
                .andExpect(status().isConflict());
        send(DIRECTOR, post("/api/timetable"), """
                {"classroomId":1,"dayOfWeek":6,"startTime":"10:00","endTime":"09:00","subject":"Arabe"}""")
                .andExpect(status().isBadRequest());
        send(TEACHER, post("/api/timetable"), """
                {"classroomId":1,"dayOfWeek":6,"startTime":"09:00","endTime":"10:00","subject":"Arabe"}""")
                .andExpect(status().isForbidden());
    }

    @Test
    void familiesMessageTheStaffAndUnreadCountsFollow() throws Exception {
        var contacts = body(call(PARENT, get("/api/conversations/contacts")).andExpect(status().isOk()));
        List<String> roles = JsonPath.read(contacts, "$[*].role");
        assertThat(roles).isNotEmpty().doesNotContain("PARENT", "STUDENT");

        var teacherId = idOf(TEACHER);
        var started = body(send(PARENT, post("/api/conversations"), """
                {"recipientIds":[%d],"subject":"Sortie scolaire","body":"Quelle tenue prévoir ?"}""".formatted(teacherId))
                .andExpect(status().isCreated()));
        Integer conversationId = JsonPath.read(started, "$.id");

        var unread = (Integer) JsonPath.read(body(call(TEACHER, get("/api/conversations/unread-count"))), "$.count");
        assertThat(unread).isPositive();
        call(TEACHER, get("/api/conversations/{id}/messages", conversationId))
                .andExpect(jsonPath("$[0].body").value("Quelle tenue prévoir ?"))
                .andExpect(jsonPath("$[0].mine").value(false));
        var after = (Integer) JsonPath.read(body(call(TEACHER, get("/api/conversations/unread-count"))), "$.count");
        assertThat(after).isEqualTo(unread - 1);

        send(PARENT, post("/api/conversations"), """
                {"recipientIds":[%d],"subject":"Bonjour","body":"Salut"}""".formatted(idOf("parent.berrada@madrasti.ma")))
                .andExpect(status().isForbidden());
    }

    @Test
    void quizzesHideAnswersUntilTheSingleAttempt() throws Exception {
        var list = body(call(ADAM, get("/api/quizzes")).andExpect(status().isOk()));
        List<Integer> scienceQuiz = JsonPath.read(list, "$[?(@.subject == 'Sciences')].id");
        var quizId = scienceQuiz.getFirst();

        call(ADAM, get("/api/quizzes/{id}", quizId))
                .andExpect(jsonPath("$.questions.length()").value(3))
                .andExpect(jsonPath("$.questions[0].correctIndex").doesNotExist());

        send(ADAM, post("/api/quizzes/{id}/attempts", quizId), "{\"answers\":[1,1,2]}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.score").value(2))
                .andExpect(jsonPath("$.total").value(3));
        send(ADAM, post("/api/quizzes/{id}/attempts", quizId), "{\"answers\":[1,1,0]}")
                .andExpect(status().isConflict());
        call(ADAM, get("/api/quizzes/{id}", quizId))
                .andExpect(jsonPath("$.questions[0].correctIndex").value(1))
                .andExpect(jsonPath("$.questions[2].myAnswer").value(2));
        call(TEACHER, get("/api/quizzes/{id}/attempts", quizId))
                .andExpect(jsonPath("$[0].studentName").value("Adam Adari"));
    }

    @Test
    void reportCardRanksTheStudentInTheClass() throws Exception {
        var adam = (Integer) JsonPath.read(body(call(ADAM, get("/api/students/me"))), "$.id");
        call(PARENT, get("/api/students/{id}/report-card", adam).param("term", "T1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subjects.length()").value(5))
                .andExpect(jsonPath("$.rank", allOf(greaterThanOrEqualTo(1), lessThanOrEqualTo(4))))
                .andExpect(jsonPath("$.classSize").value(4))
                .andExpect(jsonPath("$.mention").isNotEmpty());
    }

    @Test
    void publicPreRegistrationReachesTheDirection() throws Exception {
        mvc.perform(post("/api/public/pre-registrations").contentType(MediaType.APPLICATION_JSON).content("""
                        {"childFirstName":"Ilyas","childLastName":"Zahraoui","birthDate":"2018-05-02","desiredLevel":"CE2",
                         "parentName":"Leila Zahraoui","parentEmail":"Leila@Example.com","parentPhone":"+212 600 00 00 00"}"""))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/pre-registrations")).andExpect(status().isUnauthorized());
        call(DIRECTOR, get("/api/pre-registrations"))
                .andExpect(jsonPath("$[0].parentEmail").value("leila@example.com"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    void subscribingToAServiceBillsTheFamilyOnce() throws Exception {
        var adam = (Integer) JsonPath.read(body(call(ADAM, get("/api/students/me"))), "$.id");
        var services = body(call(PARENT, get("/api/services").param("studentId", adam.toString())));
        List<Integer> robotics = JsonPath.read(services, "$[?(@.name == 'Club robotique')].id");

        send(PARENT, post("/api/services/{id}/subscriptions", robotics.getFirst()), "{\"studentId\":%d}".formatted(adam))
                .andExpect(status().isCreated());
        send(PARENT, post("/api/services/{id}/subscriptions", robotics.getFirst()), "{\"studentId\":%d}".formatted(adam))
                .andExpect(status().isConflict());
        call(PARENT, get("/api/payments/student/{id}", adam))
                .andExpect(jsonPath("$[*].label", hasItem(startsWith("Club robotique — "))));
        Integer otherFamilyChild = JsonPath.read(body(call(DIRECTOR, get("/api/students").param("q", "Berrada"))), "$.content[0].id");
        send(PARENT, post("/api/services/{id}/subscriptions", robotics.getFirst()), "{\"studentId\":%d}".formatted(otherFamilyChild))
                .andExpect(status().isForbidden());
    }

    @Test
    void libraryRefusesToLendAnUnavailableBook() throws Exception {
        var catalog = body(call(ADAM, get("/api/books").param("q", "lion")));
        List<Integer> lion = JsonPath.read(catalog, "$[*].id");
        call(ADAM, get("/api/books").param("q", "lion")).andExpect(jsonPath("$[0].available").value(0));
        send(TEACHER, post("/api/loans"), "{\"bookId\":%d,\"studentId\":5,\"days\":14}".formatted(lion.getFirst()))
                .andExpect(status().isConflict());
        call(TEACHER, get("/api/loans")).andExpect(jsonPath("$[*].status", hasItem("OVERDUE")));
    }

    @Test
    void complaintsAreAnsweredByTheDirection() throws Exception {
        var created = body(send(PARENT, post("/api/complaints"), """
                {"category":"ADMINISTRATION","subject":"Certificat de scolarité","body":"Pouvez-vous m'en envoyer un ?"}""")
                .andExpect(status().isCreated()));
        Integer id = JsonPath.read(created, "$.id");
        send(PARENT, put("/api/complaints/{id}", id), "{\"status\":\"RESOLVED\"}").andExpect(status().isForbidden());
        send(DIRECTOR, put("/api/complaints/{id}", id), "{\"status\":\"RESOLVED\",\"response\":\"Envoyé par email.\"}")
                .andExpect(jsonPath("$.status").value("RESOLVED"));
        call(PARENT, get("/api/complaints")).andExpect(jsonPath("$[?(@.id == %d)].response".formatted(id)).value("Envoyé par email."));
    }

    private ResultActions call(String email, org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + token(email)));
    }

    private ResultActions send(String email, org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder request, String json) throws Exception {
        return call(email, request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String body(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString();
    }

    private Integer idOf(String email) throws Exception {
        var page = body(call("admin@madrasti.ma", get("/api/admin/users").param("q", email)));
        return JsonPath.read(page, "$.content[0].id");
    }

    private String token(String email) throws Exception {
        var response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, DemoDataSeeder.DEMO_PASSWORD)))
                .andExpect(status().isOk());
        return JsonPath.read(body(response), "$.accessToken");
    }
}
