package ma.madrasti;

import jakarta.servlet.http.Cookie;
import ma.madrasti.auth.SessionCookie;
import ma.madrasti.config.DemoDataSeeder;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class SecurityHardeningIntegrationTest {

    private static final String LOGIN = """
            {"email":"parent.adari@madrasti.ma","password":"%s"}""".formatted(DemoDataSeeder.DEMO_PASSWORD);

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class SessionCookieTest {

        @Autowired
        MockMvc mvc;

        @Test
        void browserSessionLivesInAnHttpOnlyStrictCookie() throws Exception {
            var setCookie = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getHeader("Set-Cookie");
            assertThat(setCookie).startsWith(SessionCookie.NAME + "=").contains("HttpOnly", "SameSite=Strict", "Path=/api");

            var cookie = new Cookie(SessionCookie.NAME, setCookie.substring(SessionCookie.NAME.length() + 1, setCookie.indexOf(';')));
            mvc.perform(get("/api/auth/me").cookie(cookie)).andExpect(jsonPath("$.email").value("parent.adari@madrasti.ma"));

            // Requête modifiante portée par le cookie : l'en-tête applicatif est obligatoire (défense CSRF).
            mvc.perform(put("/api/auth/me/language").cookie(cookie).contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"fr\"}"))
                    .andExpect(status().isForbidden());
            mvc.perform(put("/api/auth/me/language").cookie(cookie).header("X-Madrasti-Client", "web")
                            .contentType(MediaType.APPLICATION_JSON).content("{\"language\":\"fr\"}"))
                    .andExpect(status().isOk());

            // Se reconnecter avec un ancien cookie reste possible (route sans session).
            mvc.perform(post("/api/auth/login").cookie(cookie).contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                    .andExpect(status().isOk());

            mvc.perform(post("/api/auth/logout"))
                    .andExpect(status().isNoContent())
                    .andExpect(header().string("Set-Cookie", containsString("Max-Age=0")));
        }

        /** Cookie invalide (expiré, autre environnement, secret JWT changé) : on peut toujours se reconnecter ou se déconnecter. */
        @Test
        void anInvalidSessionCookieNeverBlocksLoginOrLogout() throws Exception {
            var stale = new Cookie(SessionCookie.NAME, "eyJhbGciOiJIUzI1NiJ9.e30.signature-invalide");
            mvc.perform(post("/api/auth/login").cookie(stale).contentType(MediaType.APPLICATION_JSON).content(LOGIN))
                    .andExpect(status().isOk());
            mvc.perform(post("/api/auth/logout").cookie(stale)).andExpect(status().isNoContent());
            // Ailleurs, le cookie invalide est bien refusé.
            mvc.perform(get("/api/auth/me").cookie(stale)).andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @SpringBootTest(properties = {"madrasti.security.login-per-minute=3", "madrasti.security.public-per-minute=2"})
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class RateLimitTest {

        @Autowired
        MockMvc mvc;

        @Test
        void bruteForceIsThrottledWithALocalizedMessage() throws Exception {
            var wrong = "{\"email\":\"admin@madrasti.ma\",\"password\":\"guess\"}";
            for (var i = 0; i < 3; i++) {
                mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(wrong)).andExpect(status().isUnauthorized());
            }
            mvc.perform(post("/api/auth/login").header("Accept-Language", "en").contentType(MediaType.APPLICATION_JSON).content(wrong))
                    .andExpect(status().isTooManyRequests())
                    .andExpect(header().exists("Retry-After"))
                    .andExpect(jsonPath("$.detail").value("Too many attempts. Please try again in a minute."));
        }
    }
}
