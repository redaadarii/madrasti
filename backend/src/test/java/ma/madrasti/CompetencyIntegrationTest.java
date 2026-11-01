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
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Livret de compétences : référentiel, saisie par l'enseignant, lecture par la famille. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CompetencyIntegrationTest {

    private static final String DIRECTOR = "direction@madrasti.ma";
    private static final String TEACHER = "prof.math@madrasti.ma";
    private static final String PARENT = "parent.adari@madrasti.ma";
    private static final String OTHER_PARENT = "parent.berrada@madrasti.ma";

    @Autowired
    MockMvc mvc;

    @Test
    void teachersAssessCompetenciesThatFamiliesReadPerSubject() throws Exception {
        var created = body(send(TEACHER, post("/api/competencies"),
                "{\"subject\":\"Géographie\",\"label\":\"Se repérer sur une carte\",\"level\":\" \"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.level").value(nullValue())));
        Integer competencyId = JsonPath.read(created, "$.id");
        var adam = studentId("Adari");
        Integer classroomId = JsonPath.read(body(call(DIRECTOR, get("/api/students/{id}", adam))), "$.classroomId");

        assess(TEACHER, adam, competencyId, "T2", "\"IN_PROGRESS\"").andExpect(status().isOk());
        assess(TEACHER, adam, competencyId, "T2", "\"ACQUIRED\"").andExpect(status().isOk());
        assess(TEACHER, adam, competencyId, "T9", "\"ACQUIRED\"").andExpect(status().isBadRequest());

        call(TEACHER, get("/api/competencies/classrooms/{id}", classroomId).param("term", "T2"))
                .andExpect(jsonPath("$.competencies[*].id", hasItem(competencyId)))
                .andExpect(jsonPath("$.students[?(@.studentId == %d)].levels.%d".formatted(adam, competencyId), contains("ACQUIRED")));

        call(PARENT, get("/api/competencies/students/{id}", adam).param("term", "T2"))
                .andExpect(jsonPath("$[?(@.subject == 'Géographie')].competencies[0].mastery", contains("ACQUIRED")));
        call(OTHER_PARENT, get("/api/competencies/students/{id}", adam)).andExpect(status().isForbidden());
        assess(PARENT, adam, competencyId, "T2", "\"EXCEEDED\"").andExpect(status().isForbidden());

        // Effacer une évaluation, puis supprimer la compétence (réservé à la direction).
        assess(TEACHER, adam, competencyId, "T2", "null").andExpect(status().isOk());
        call(PARENT, get("/api/competencies/students/{id}", adam).param("term", "T2"))
                .andExpect(jsonPath("$[?(@.subject == 'Géographie')]").isEmpty());
        call(TEACHER, delete("/api/competencies/{id}", competencyId)).andExpect(status().isForbidden());
        call(DIRECTOR, delete("/api/competencies/{id}", competencyId)).andExpect(status().isNoContent());
    }

    @Test
    void competenciesLimitedToALevelOnlyShowForThatLevel() throws Exception {
        Integer id = JsonPath.read(body(send(DIRECTOR, post("/api/competencies"),
                "{\"subject\":\"Anglais\",\"label\":\"Se présenter\",\"level\":\"Niveau inexistant\"}")), "$.id");
        var adam = studentId("Adari");
        Integer classroomId = JsonPath.read(body(call(DIRECTOR, get("/api/students/{id}", adam))), "$.classroomId");
        call(TEACHER, get("/api/competencies/classrooms/{id}", classroomId))
                .andExpect(jsonPath("$.competencies[*].id", not(hasItem(id))));
        call(DIRECTOR, delete("/api/competencies/{id}", id)).andExpect(status().isNoContent());
    }

    private ResultActions assess(String email, Integer studentId, Integer competencyId, String term, String mastery) throws Exception {
        return send(email, put("/api/competencies/assessments"),
                "{\"studentId\":%d,\"competencyId\":%d,\"term\":\"%s\",\"mastery\":%s}".formatted(studentId, competencyId, term, mastery));
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
