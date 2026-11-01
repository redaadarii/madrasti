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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OperationsIntegrationTest {

    private static final String DIRECTOR = "direction@madrasti.ma";
    private static final String TEACHER = "prof.math@madrasti.ma";
    private static final String PARENT = "parent.adari@madrasti.ma";
    private static final String ADAM = "adam.adari@eleve.madrasti.ma";

    /** PNG 1×1 valide. */
    private static final byte[] PNG = java.util.Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");

    @Autowired
    MockMvc mvc;

    @Test
    void absencesNotifyTheFamilyAndTextTheParentInTheirLanguage() throws Exception {
        var before = unread(PARENT);
        var adam = studentId("Adari");
        send(TEACHER, post("/api/absences"), "{\"studentId\":%d,\"day\":\"%s\",\"kind\":\"LATE\"}".formatted(adam, LocalDate.now()))
                .andExpect(status().isCreated());
        assertThat(unread(PARENT)).isEqualTo(before + 1);
        call(PARENT, get("/api/notifications"))
                .andExpect(jsonPath("$[0].type").value("ABSENCE"))
                .andExpect(jsonPath("$[0].params.name").value(adam == null ? "" : "Adam"))
                .andExpect(jsonPath("$[0].read").value(false));

        // La famille Berrada a choisi l'arabe : son SMS d'absence est rédigé en arabe.
        send(TEACHER, post("/api/absences"), "{\"studentId\":%d,\"day\":\"%s\",\"kind\":\"ABSENCE\"}".formatted(studentId("Berrada"), LocalDate.now()))
                .andExpect(status().isCreated());
        call(DIRECTOR, get("/api/sms"))
                .andExpect(jsonPath("$[0].body", startsWith("سكولاريس")))
                .andExpect(jsonPath("$[0].status").value("SENT"));

        call(PARENT, post("/api/notifications/read-all")).andExpect(status().isNoContent());
        assertThat(unread(PARENT)).isZero();
    }

    @Test
    void notificationStreamOpensAnEventStream() throws Exception {
        call(PARENT, get("/api/notifications/stream"))
                .andExpect(request().asyncStarted());
    }

    @Test
    void smsBroadcastRequiresAClassForClassAudience() throws Exception {
        send(DIRECTOR, post("/api/sms/broadcast"), "{\"audience\":\"CLASS_PARENTS\",\"message\":\"Réunion samedi\"}")
                .andExpect(status().isBadRequest());
        send(DIRECTOR, post("/api/sms/broadcast"), "{\"audience\":\"ALL_PARENTS\",\"message\":\"École fermée lundi\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(greaterThanOrEqualTo(6)));
        send(TEACHER, post("/api/sms/broadcast"), "{\"audience\":\"ALL_PARENTS\",\"message\":\"x\"}")
                .andExpect(status().isForbidden());
    }

    @Test
    void paidExpensesFeedTheFinanceReport() throws Exception {
        var year = LocalDate.now().getYear();
        var before = ((Number) JsonPath.read(body(call(DIRECTOR, get("/api/finance/report"))), "$.totalExpenses")).doubleValue();
        var created = body(send(DIRECTOR, post("/api/expenses"), """
                {"label":"Peinture des classes","category":"MAINTENANCE","supplier":"Atlas Peinture","reference":"BC-99",
                 "amount":1500,"orderedOn":"%s"}""".formatted(LocalDate.now())).andExpect(status().isCreated()));
        Integer id = JsonPath.read(created, "$.id");
        send(DIRECTOR, put("/api/expenses/{id}/status", id), "{\"status\":\"PAID\"}")
                .andExpect(jsonPath("$.paidOn").value(LocalDate.now().toString()));
        call(DIRECTOR, get("/api/finance/report").param("year", String.valueOf(year)))
                .andExpect(jsonPath("$.months.length()").value(12))
                .andExpect(jsonPath("$.totalExpenses").value(closeTo(before + 1500, 0.01)))
                .andExpect(jsonPath("$.expensesByCategory.MAINTENANCE").exists());
        call(TEACHER, get("/api/expenses")).andExpect(status().isForbidden());
    }

    @Test
    void galleryAcceptsImagesOnlyAndServesThem() throws Exception {
        var album = body(send(TEACHER, post("/api/albums"), "{\"title\":\"Carnaval\",\"classroomId\":2}").andExpect(status().isCreated()));
        Integer albumId = JsonPath.read(album, "$.id");

        var updated = body(call(TEACHER, multipart("/api/albums/{id}/photos", albumId)
                .file(new MockMultipartFile("files", "carnaval.png", "image/png", PNG)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.photos.length()").value(1)));
        String fileId = JsonPath.read(updated, "$.photos[0].fileId");
        call(ADAM, get("/api/files/{id}", fileId))
                .andExpect(status().isOk())
                .andExpect(content().contentType("image/png"));

        call(TEACHER, multipart("/api/albums/{id}/photos", albumId)
                .file(new MockMultipartFile("files", "virus.html", "text/html", "<script>".getBytes())))
                .andExpect(status().isConflict());
        call(ADAM, get("/api/albums")).andExpect(jsonPath("$[*].title", hasItem("Carnaval")));
    }

    @Test
    void courseResourcesRequireHttpsLinks() throws Exception {
        call(TEACHER, multipart("/api/resources").param("classroomId", "2").param("subject", "Français")
                .param("title", "Dictée audio").param("kind", "LINK").param("url", "http://insecure.example"))
                .andExpect(status().isConflict());
        call(TEACHER, multipart("/api/resources").param("classroomId", "2").param("subject", "Français")
                .param("title", "Dictée audio").param("kind", "VIDEO").param("url", "https://www.youtube.com/watch?v=abc"))
                .andExpect(status().isCreated());
        call(ADAM, get("/api/resources")).andExpect(jsonPath("$[*].title", hasItem("Dictée audio")));
    }

    @Test
    void councilDecisionsAppearOnTheReportCard() throws Exception {
        var adam = studentId("Adari");
        call(DIRECTOR, get("/api/councils/2").param("term", "T1"))
                .andExpect(jsonPath("$[0].rank").value(1))
                .andExpect(jsonPath("$[0].suggested").exists());
        send("prof.sciences@madrasti.ma", put("/api/councils/decisions"),
                "{\"studentId\":%d,\"term\":\"T1\",\"decision\":\"COMPLIMENTS\"}".formatted(adam))
                .andExpect(status().isForbidden());
        send(DIRECTOR, put("/api/councils/decisions"),
                "{\"studentId\":%d,\"term\":\"T1\",\"decision\":\"COMPLIMENTS\",\"appreciation\":\"Très bon trimestre\"}".formatted(adam))
                .andExpect(status().isOk());
        call(PARENT, get("/api/students/{id}/report-card", adam).header("Accept-Language", "en"))
                .andExpect(jsonPath("$.councilDecision").value("Commendation"))
                .andExpect(jsonPath("$.councilAppreciation").value("Très bon trimestre"));
    }

    @Test
    void massarExportListsEveryStudentWithTheirCode() throws Exception {
        var csv = call(TEACHER, get("/api/exports/massar").param("classroomId", "2").param("term", "T1").param("subject", "Mathématiques"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", containsString("massar-")))
                .andReturn().getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
        var lines = csv.strip().split("\r\n");
        assertThat(lines[0]).isEqualTo("﻿CodeMassar;Nom;Prenom;Note");
        assertThat(lines).hasSize(5);
        assertThat(lines[1]).matches("G\\d{9};[^;]+;[^;]+;\\d+,\\d{2}");
    }

    @Test
    void statsHighlightStudentsBelowTheAverage() throws Exception {
        call(TEACHER, get("/api/stats"))
                .andExpect(jsonPath("$.subjects.length()").value(5))
                .andExpect(jsonPath("$.distribution.length()").value(6))
                .andExpect(jsonPath("$.absences.length()").value(6))
                .andExpect(jsonPath("$.atRisk[*].average", everyItem(lessThan(10.0))));
        call(PARENT, get("/api/stats")).andExpect(status().isForbidden());
    }

    @Test
    void usersCanStoreTheirPreferredLanguage() throws Exception {
        send(ADAM, put("/api/auth/me/language"), "{\"language\":\"ar\"}").andExpect(jsonPath("$.language").value("ar"));
        send(ADAM, put("/api/auth/me/language"), "{\"language\":\"de\"}").andExpect(status().isBadRequest());
        send(ADAM, put("/api/auth/me/language"), "{\"language\":\"fr\"}").andExpect(status().isOk());
    }

    private long unread(String email) throws Exception {
        return ((Number) JsonPath.read(body(call(email, get("/api/notifications/unread-count"))), "$.count")).longValue();
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
