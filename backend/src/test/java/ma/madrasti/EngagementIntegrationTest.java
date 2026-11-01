package ma.madrasti;

import com.jayway.jsonpath.JsonPath;
import ma.madrasti.config.DemoDataSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Rendez-vous parents-professeurs, sondages, comportement, justificatifs d'absence et attestation. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EngagementIntegrationTest {

    private static final String DIRECTOR = "direction@madrasti.ma";
    private static final String TEACHER = "prof.math@madrasti.ma";
    private static final String PARENT = "parent.adari@madrasti.ma";
    private static final String OTHER_PARENT = "parent.berrada@madrasti.ma";
    private static final String ADAM = "adam.adari@eleve.madrasti.ma";

    private static final byte[] PNG = java.util.Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    @Autowired
    MockMvc mvc;

    @Test
    void parentsBookTeacherSlotsAndOnlyOneFamilyGetsEachSlot() throws Exception {
        var date = LocalDate.now().plusDays(40);
        var published = body(send(TEACHER, post("/api/appointments/slots"),
                "{\"date\":\"%s\",\"startTime\":\"08:00\",\"count\":3,\"durationMinutes\":15,\"mode\":\"VISIO\"}".formatted(date))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$", hasSize(3)))
                .andExpect(jsonPath("$[2].startsAt").value(date + "T08:30:00")));
        Integer slotId = JsonPath.read(published, "$[0].id");

        // Chevauchement avec la série existante.
        send(TEACHER, post("/api/appointments/slots"),
                "{\"date\":\"%s\",\"startTime\":\"08:20\",\"count\":1,\"durationMinutes\":15,\"mode\":\"PHONE\"}".formatted(date))
                .andExpect(status().isConflict());

        var adam = studentId("Adari");
        send(PARENT, post("/api/appointments/slots/{id}/book", slotId), "{\"studentId\":%d,\"topic\":\"Les fractions\"}".formatted(adam))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mine").value(true))
                .andExpect(jsonPath("$.studentName", startsWith("Adam")));

        // Une autre famille ne peut ni réserver ce créneau, ni voir qui l'a pris, ni réserver pour un enfant qui n'est pas le sien.
        var berrada = studentId("Berrada");
        send(OTHER_PARENT, post("/api/appointments/slots/{id}/book", slotId), "{\"studentId\":%d}".formatted(berrada))
                .andExpect(status().isConflict());
        call(OTHER_PARENT, get("/api/appointments"))
                .andExpect(jsonPath("$[?(@.id == %d)]".formatted(slotId)).isEmpty());
        send(OTHER_PARENT, post("/api/appointments/slots/{id}/book", slotId + 1), "{\"studentId\":%d}".formatted(adam))
                .andExpect(status().isNotFound());

        call(TEACHER, get("/api/appointments"))
                .andExpect(jsonPath("$[?(@.id == %d)].parentName".formatted(slotId), contains("Famille Adari")));
        call(TEACHER, get("/api/notifications")).andExpect(jsonPath("$[0].type").value("APPOINTMENT"))
                .andExpect(jsonPath("$[0].params.status").value("BOOKED"));
        call(TEACHER, delete("/api/appointments/slots/{id}", slotId)).andExpect(status().isConflict());

        call(PARENT, post("/api/appointments/slots/{id}/cancel", slotId))
                .andExpect(jsonPath("$.booked").value(false));
        call(OTHER_PARENT, post("/api/appointments/slots/{id}/cancel", slotId + 1)).andExpect(status().isNotFound());
        call(TEACHER, delete("/api/appointments/slots/{id}", slotId)).andExpect(status().isNoContent());
        call(ADAM, get("/api/appointments")).andExpect(status().isForbidden());
    }

    @Test
    void pollResultsAreHiddenUntilYouAnswer() throws Exception {
        var created = body(send(DIRECTOR, post("/api/polls"),
                "{\"question\":\"Kermesse samedi ?\",\"audience\":\"PARENTS\",\"options\":[\"Oui\",\"Non\",\"Peut-être\"]}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalVotes").value(0)));
        Integer pollId = JsonPath.read(created, "$.id");
        Integer yes = JsonPath.read(created, "$.options[0].id");
        var path = "$[?(@.id == %d)]".formatted(pollId);

        call(PARENT, get("/api/polls"))
                .andExpect(jsonPath(path + ".totalVotes", contains((Object) null)))
                .andExpect(jsonPath(path + ".canManage", contains(false)));
        send(PARENT, post("/api/polls/{id}/vote", pollId), "{\"optionId\":%d}".formatted(yes))
                .andExpect(jsonPath("$.myChoice").value(yes))
                .andExpect(jsonPath("$.totalVotes").value(1))
                .andExpect(jsonPath("$.options[0].votes").value(1));
        send(PARENT, post("/api/polls/{id}/vote", pollId), "{\"optionId\":%d}".formatted(yes))
                .andExpect(status().isConflict());

        // Hors audience : invisible pour les enseignants ; un élève ne peut pas créer de sondage.
        call(TEACHER, get("/api/polls")).andExpect(jsonPath(path).isEmpty());
        send(TEACHER, post("/api/polls/{id}/vote", pollId), "{\"optionId\":%d}".formatted(yes)).andExpect(status().isNotFound());
        send(ADAM, post("/api/polls"), "{\"question\":\"?\",\"audience\":\"ALL\",\"options\":[\"a\",\"b\"]}")
                .andExpect(status().isForbidden());
        send(DIRECTOR, post("/api/polls"), "{\"question\":\"?\",\"audience\":\"ALL\",\"options\":[\"a\"]}")
                .andExpect(status().isBadRequest());

        call(PARENT, post("/api/polls/{id}/close", pollId)).andExpect(status().isForbidden());
        call(DIRECTOR, post("/api/polls/{id}/close", pollId)).andExpect(jsonPath("$.open").value(false));
        send(OTHER_PARENT, post("/api/polls/{id}/vote", pollId), "{\"optionId\":%d}".formatted(yes))
                .andExpect(status().isConflict());
    }

    @Test
    void behaviorPointsReachTheFamilyAndAddUpPerClass() throws Exception {
        var adam = studentId("Adari");
        var before = ((Number) JsonPath.read(body(call(PARENT, get("/api/behavior").param("studentId", adam.toString()))), "$.balance")).intValue();
        send(TEACHER, post("/api/behavior"), "{\"studentId\":%d,\"category\":\"PARTICIPATION\",\"note\":\"Bravo\"}".formatted(adam))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.points").value(1));
        send(TEACHER, post("/api/behavior"), "{\"studentId\":%d,\"category\":\"HELPING\",\"sanction\":\"DETENTION\"}".formatted(adam))
                .andExpect(status().isConflict());
        var incident = body(send(TEACHER, post("/api/behavior"),
                "{\"studentId\":%d,\"category\":\"DISRESPECT\",\"sanction\":\"WARNING\"}".formatted(adam))
                .andExpect(jsonPath("$.positive").value(false)));

        call(PARENT, get("/api/behavior").param("studentId", adam.toString()))
                .andExpect(jsonPath("$.balance").value(before - 1))
                .andExpect(jsonPath("$.records[0].sanction").value("WARNING"));
        call(PARENT, get("/api/notifications")).andExpect(jsonPath("$[0].type").value("BEHAVIOR"));
        call(OTHER_PARENT, get("/api/behavior").param("studentId", adam.toString())).andExpect(status().isForbidden());
        send(PARENT, post("/api/behavior"), "{\"studentId\":%d,\"category\":\"EFFORT\"}".formatted(adam)).andExpect(status().isForbidden());

        Integer classroomId = JsonPath.read(body(call(DIRECTOR, get("/api/students/{id}", adam))), "$.classroomId");
        call(TEACHER, get("/api/behavior/classrooms/{id}", classroomId))
                .andExpect(jsonPath("$.students[?(@.studentId == %d)]".formatted(adam)).isNotEmpty())
                .andExpect(jsonPath("$.recent").isArray());

        Integer incidentId = JsonPath.read(incident, "$.id");
        call("prof.sciences@madrasti.ma", delete("/api/behavior/{id}", incidentId)).andExpect(status().isForbidden());
        call(TEACHER, delete("/api/behavior/{id}", incidentId)).andExpect(status().isNoContent());
    }

    @Test
    void parentsSendAbsenceJustificationsThatTheSchoolReviews() throws Exception {
        var adam = studentId("Adari");
        var absence = body(send(TEACHER, post("/api/absences"),
                "{\"studentId\":%d,\"day\":\"%s\",\"kind\":\"ABSENCE\"}".formatted(adam, LocalDate.now().minusDays(1)))
                .andExpect(status().isCreated()));
        Integer id = JsonPath.read(absence, "$.id");

        var proof = new MockMultipartFile("file", "certificat.png", "image/png", PNG);
        call(OTHER_PARENT, multipart("/api/absences/{id}/justification", id).file(proof).param("note", "Malade"))
                .andExpect(status().isNotFound());
        call(PARENT, multipart("/api/absences/{id}/justification", id).file(proof).param("note", "Fièvre, certificat joint"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.justificationStatus").value("PENDING"))
                .andExpect(jsonPath("$.justificationFileName").value("certificat.png"))
                .andExpect(jsonPath("$.justified").value(false));

        call(DIRECTOR, get("/api/absences/justifications"))
                .andExpect(jsonPath("$[?(@.id == %d)]".formatted(id)).isNotEmpty());
        call(DIRECTOR, get("/api/notifications")).andExpect(jsonPath("$[0].type").value("JUSTIFICATION"));

        send(DIRECTOR, patch("/api/absences/{id}/justification", id), "{\"accepted\":true}")
                .andExpect(jsonPath("$.justified").value(true))
                .andExpect(jsonPath("$.reason").value("Fièvre, certificat joint"))
                .andExpect(jsonPath("$.justificationStatus").value("ACCEPTED"));
        send(DIRECTOR, patch("/api/absences/{id}/justification", id), "{\"accepted\":false}")
                .andExpect(status().isConflict());
        call(PARENT, multipart("/api/absences/{id}/justification", id).param("note", "encore"))
                .andExpect(status().isConflict());
    }

    @Test
    void familiesDownloadASchoolCertificate() throws Exception {
        var adam = studentId("Adari");
        var response = call(PARENT, get("/api/students/{id}/certificate", adam))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("attestation-scolarite-adari")))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(new String(response, 0, 5)).isEqualTo("%PDF-");
        call(OTHER_PARENT, get("/api/students/{id}/certificate", adam)).andExpect(status().isForbidden());
    }

    private Integer studentId(String lastName) throws Exception {
        List<Integer> ids = JsonPath.read(body(call(DIRECTOR, get("/api/students").param("q", lastName).param("sort", "firstName"))), "$.content[*].id");
        return ids.getFirst();
    }

    private ResultActions call(String email, AbstractMockHttpServletRequestBuilder<?> request) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + token(email)));
    }

    private ResultActions send(String email, AbstractMockHttpServletRequestBuilder<?> request, String json) throws Exception {
        return call(email, request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private static String body(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString();
    }

    private String token(String email) throws Exception {
        var response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, DemoDataSeeder.DEMO_PASSWORD)));
        return JsonPath.read(body(response), "$.accessToken");
    }
}
