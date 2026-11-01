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

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Journal d'audit : connexions (réussies ou non) et actions sensibles, consultable par l'administrateur seul. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditIntegrationTest {

    private static final String ADMIN = "admin@madrasti.ma";

    @Autowired
    MockMvc mvc;

    @Test
    void failedAndSuccessfulLoginsAreTraced() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"prof.math@madrasti.ma\",\"password\":\"mauvais-mot-de-passe\"}"))
                .andExpect(status().isUnauthorized());

        call(ADMIN, get("/api/admin/audit").param("action", "LOGIN_FAILED").param("q", "prof.math"))
                .andExpect(jsonPath("$.content[0].actorEmail").value("prof.math@madrasti.ma"))
                .andExpect(jsonPath("$.content[0].ip").value("127.0.0.1"));
        call(ADMIN, get("/api/admin/audit").param("action", "LOGIN_SUCCESS").param("q", "admin@"))
                .andExpect(jsonPath("$.totalElements", greaterThan(0)));
    }

    @Test
    void accountChangesNameTheAdminWhoMadeThem() throws Exception {
        var email = "audit.%d@madrasti.ma".formatted(System.nanoTime());
        Integer id = JsonPath.read(send(ADMIN, post("/api/admin/users"),
                "{\"email\":\"%s\",\"firstName\":\"Ines\",\"lastName\":\"Bennis\",\"role\":\"TEACHER\",\"password\":\"MotDePasse1\"}".formatted(email))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString(), "$.id");
        send(ADMIN, put("/api/admin/users/{id}/password", id), "{\"password\":\"NouveauMotDePasse1\"}").andExpect(status().is2xxSuccessful());

        call(ADMIN, get("/api/admin/audit").param("q", email))
                .andExpect(jsonPath("$.content[*].action", hasItems("USER_CREATED", "PASSWORD_RESET")))
                .andExpect(jsonPath("$.content[*].actorEmail", everyItem(is(ADMIN))))
                .andExpect(jsonPath("$.content[?(@.action == 'USER_CREATED')].detail", contains("role=TEACHER")));
    }

    @Test
    void onlyTheAdministratorReadsTheAuditLog() throws Exception {
        call("direction@madrasti.ma", get("/api/admin/audit")).andExpect(status().isForbidden());
        call(ADMIN, get("/api/admin/audit").param("action", "INCONNU")).andExpect(status().isBadRequest());
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
