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

import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Menus de la cantine et import CSV des élèves à la rentrée. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OnboardingIntegrationTest {

    private static final String DIRECTOR = "direction@madrasti.ma";
    private static final String TEACHER = "prof.math@madrasti.ma";
    private static final String PARENT = "parent.adari@madrasti.ma";

    @Autowired
    MockMvc mvc;

    @Test
    void theDirectionPublishesTheCanteenMenuForFamilies() throws Exception {
        var day = LocalDate.now().plusWeeks(6).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).plusDays(2);
        send(DIRECTOR, put("/api/canteen/{date}", day), "{\"starter\":\"Harira\",\"mainCourse\":\"Couscous\",\"vegetarian\":\" \"}")
                .andExpect(jsonPath("$.mainCourse").value("Couscous"))
                .andExpect(jsonPath("$.vegetarian").value(nullValue()));
        send(DIRECTOR, put("/api/canteen/{date}", day), "{\"mainCourse\":\"Tajine\"}")
                .andExpect(jsonPath("$.starter").value(nullValue()));
        send(DIRECTOR, put("/api/canteen/{date}", day), "{\"mainCourse\":\"\"}").andExpect(status().isBadRequest());
        send(TEACHER, put("/api/canteen/{date}", day), "{\"mainCourse\":\"x\"}").andExpect(status().isForbidden());

        call(PARENT, get("/api/canteen").param("date", day.toString()))
                .andExpect(jsonPath("$.monday").value(day.minusDays(2).toString()))
                .andExpect(jsonPath("$.menus[?(@.date == '%s')].mainCourse".formatted(day), contains("Tajine")));
        call(DIRECTOR, delete("/api/canteen/{date}", day)).andExpect(status().isNoContent());
        call(DIRECTOR, delete("/api/canteen/{date}", day)).andExpect(status().isNotFound());
    }

    @Test
    void aCsvWithErrorsIsRejectedWholeAndAValidOneCreatesStudentsAndParents() throws Exception {
        var suffix = System.nanoTime() % 1_000_000;
        var bad = """
                matricule;prenom;nom;date_naissance;classe;code_massar;email_parent
                IMP-%1$d-1;Salma;Bennani;12/03/2015;CM1-B;G123450001;famille.bennani.%1$d@exemple.ma
                IMP-%1$d-2;;Alaoui;2015-13-40;Classe inconnue;123;pas-un-email
                """.formatted(suffix);
        upload(bad, false)
                .andExpect(jsonPath("$.rows").value(2))
                .andExpect(jsonPath("$.studentsCreated").value(0))
                .andExpect(jsonPath("$.errors[*].line", everyItem(is(3))))
                .andExpect(jsonPath("$.errors[*].message", hasItems(
                        containsString("prenom"), containsString("Classe inconnue"), containsString("2015-13-40"),
                        containsString("pas-un-email"))));
        // Rien n'a été enregistré : la première ligne, pourtant valide, n'existe pas.
        call(DIRECTOR, get("/api/students").param("q", "IMP-" + suffix)).andExpect(jsonPath("$.content").isEmpty());

        var good = """
                ﻿Matricule,Prenom,Nom,Classe,Email_parent,Prenom_parent
                IMP-%1$d-3,Salma,Bennani,cm1-b,famille.bennani.%1$d@exemple.ma,Hind
                IMP-%1$d-4,Omar,Bennani,CM1-B,famille.bennani.%1$d@exemple.ma,Hind
                IMP-%1$d-5,Nellia,Adari,CM1-B,parent.adari@madrasti.ma,
                """.formatted(suffix);
        upload(good, true)
                .andExpect(jsonPath("$.dryRun").value(true))
                .andExpect(jsonPath("$.studentsCreated").value(3))
                .andExpect(jsonPath("$.errors").isEmpty());
        call(DIRECTOR, get("/api/students").param("q", "IMP-" + suffix)).andExpect(jsonPath("$.content").isEmpty());

        upload(good, false)
                .andExpect(jsonPath("$.studentsCreated").value(3))
                .andExpect(jsonPath("$.parentsCreated").value(1))
                .andExpect(jsonPath("$.parentsLinked").value(1));
        call(DIRECTOR, get("/api/students").param("q", "IMP-" + suffix))
                .andExpect(jsonPath("$.content", hasSize(3)))
                .andExpect(jsonPath("$.content[*].parentName", hasItem("Hind Bennani")));
        // Réimporter le même fichier : matricules déjà pris.
        upload(good, false).andExpect(jsonPath("$.errors", hasSize(3)));

        // Les autres tests partagent la base : on retire les élèves importés.
        java.util.List<Integer> ids = JsonPath.read(call(DIRECTOR, get("/api/students").param("q", "IMP-" + suffix))
                .andReturn().getResponse().getContentAsString(), "$.content[*].id");
        for (var id : ids) {
            call(DIRECTOR, delete("/api/students/{id}", id)).andExpect(status().isNoContent());
        }
    }

    @Test
    void importRequiresTheMandatoryColumnsAndAManager() throws Exception {
        upload("nom;prenom\nA;B\n", false)
                .andExpect(jsonPath("$.errors[0].message", containsString("classe")));
        call(TEACHER, multipart("/api/students/import").file(csv("matricule\n"))).andExpect(status().isForbidden());
        call(DIRECTOR, get("/api/students/import/template"))
                .andExpect(content().contentTypeCompatibleWith("text/csv"))
                .andExpect(content().string(containsString("matricule;prenom;nom")));
    }

    private ResultActions upload(String content, boolean dryRun) throws Exception {
        return call(DIRECTOR, multipart("/api/students/import").file(csv(content)).param("dryRun", String.valueOf(dryRun)))
                .andExpect(status().isOk());
    }

    private static MockMultipartFile csv(String content) {
        return new MockMultipartFile("file", "eleves.csv", "text/csv", content.getBytes(StandardCharsets.UTF_8));
    }

    private ResultActions call(String email, AbstractMockHttpServletRequestBuilder<?> request) throws Exception {
        return mvc.perform(request.header("Authorization", "Bearer " + token(email)));
    }

    private ResultActions send(String email, AbstractMockHttpServletRequestBuilder<?> request, String json) throws Exception {
        return call(email, request.contentType(MediaType.APPLICATION_JSON).content(json));
    }

    private String token(String email) throws Exception {
        var response = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, DemoDataSeeder.DEMO_PASSWORD)));
        return JsonPath.read(response.andReturn().getResponse().getContentAsString(), "$.accessToken");
    }
}
