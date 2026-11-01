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

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Session de l'application mobile : jeton d'accès court et jeton de rafraîchissement rotatif. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RefreshTokenIntegrationTest {

    private static final String PARENT = "parent.berrada@madrasti.ma";

    @Autowired
    MockMvc mvc;

    @Test
    void theMobileAppGetsAShortAccessTokenAndARefreshTokenInsteadOfACookie() throws Exception {
        var login = mobileLogin(PARENT)
                .andExpect(header().doesNotExist("Set-Cookie"))
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
        var body = body(login);
        var expiresAt = Instant.parse(JsonPath.read(body, "$.expiresAt"));
        assertThat(Duration.between(Instant.now(), expiresAt)).isLessThanOrEqualTo(Duration.ofMinutes(16));

        String access = JsonPath.read(body, "$.accessToken");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(jsonPath("$.email").value(PARENT));

        // Le web garde son cookie de session et ne reçoit pas de jeton de rafraîchissement.
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(PARENT, DemoDataSeeder.DEMO_PASSWORD)))
                .andExpect(header().string("Set-Cookie", containsString("madrasti_session=")))
                .andExpect(jsonPath("$.refreshToken").value(nullValue()));
    }

    @Test
    void eachRefreshRotatesTheTokenAndReusingAnOldOneRevokesTheWholeSession() throws Exception {
        String first = JsonPath.read(body(mobileLogin(PARENT)), "$.refreshToken");

        var refreshed = body(refresh(first).andExpect(status().isOk()));
        String second = JsonPath.read(refreshed, "$.refreshToken");
        assertThat(second).isNotEqualTo(first);
        String access = JsonPath.read(refreshed, "$.accessToken");
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + access)).andExpect(status().isOk());

        // Rejouer l'ancien jeton (vol probable) : refusé, et le jeton légitime suivant est révoqué lui aussi.
        refresh(first).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Votre session a expiré, reconnectez-vous"));
        refresh(second).andExpect(status().isUnauthorized());

        String admin = JsonPath.read(body(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@madrasti.ma\",\"password\":\"%s\"}".formatted(DemoDataSeeder.DEMO_PASSWORD)))), "$.accessToken");
        mvc.perform(get("/api/admin/audit").param("action", "TOKEN_REUSE").param("q", PARENT).header("Authorization", "Bearer " + admin))
                .andExpect(jsonPath("$.content[0].actorEmail").value(PARENT));
    }

    @Test
    void logoutAndPasswordResetEndMobileSessions() throws Exception {
        String token = JsonPath.read(body(mobileLogin(PARENT)), "$.refreshToken");
        mvc.perform(post("/api/auth/logout").contentType(MediaType.APPLICATION_JSON).content("{\"refreshToken\":\"%s\"}".formatted(token)))
                .andExpect(status().isNoContent());
        refresh(token).andExpect(status().isUnauthorized());

        var parent = body(mobileLogin("parent.cherkaoui@madrasti.ma"));
        String other = JsonPath.read(parent, "$.refreshToken");
        Integer userId = JsonPath.read(parent, "$.user.id");
        String admin = JsonPath.read(body(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"admin@madrasti.ma\",\"password\":\"%s\"}".formatted(DemoDataSeeder.DEMO_PASSWORD)))), "$.accessToken");
        mvc.perform(put("/api/admin/users/{id}/password", userId).header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"password\":\"%s\"}".formatted(DemoDataSeeder.DEMO_PASSWORD)))
                .andExpect(status().is2xxSuccessful());
        refresh(other).andExpect(status().isUnauthorized());

        refresh("jeton-inconnu").andExpect(status().isUnauthorized());
    }

    private ResultActions mobileLogin(String email) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\",\"client\":\"mobile\"}".formatted(email, DemoDataSeeder.DEMO_PASSWORD)));
    }

    private ResultActions refresh(String token) throws Exception {
        return mvc.perform(post("/api/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                .content("{\"refreshToken\":\"%s\"}".formatted(token)));
    }

    private static String body(ResultActions result) throws Exception {
        return result.andReturn().getResponse().getContentAsString();
    }
}
