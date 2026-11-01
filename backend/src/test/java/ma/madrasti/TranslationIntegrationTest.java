package ma.madrasti;

import com.jayway.jsonpath.JsonPath;
import ma.madrasti.config.DemoDataSeeder;
import ma.madrasti.translation.Translator;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class TranslationIntegrationTest {

    static String token(MockMvc mvc) throws Exception {
        var body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"parent.adari@madrasti.ma\",\"password\":\"%s\"}".formatted(DemoDataSeeder.DEMO_PASSWORD)))
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + JsonPath.read(body, "$.accessToken");
    }

    @Nested
    @SpringBootTest
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    class WithoutApiKey {

        @Autowired
        MockMvc mvc;

        @Test
        void translationIsDisabledAndSaysSo() throws Exception {
            var auth = token(mvc);
            mvc.perform(get("/api/translate/status").header("Authorization", auth)).andExpect(jsonPath("$.enabled").value(false));
            mvc.perform(post("/api/translate").header("Authorization", auth).header("Accept-Language", "en")
                            .contentType(MediaType.APPLICATION_JSON).content("{\"text\":\"Bonjour\",\"target\":\"en\"}"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.detail").value("Translation is unavailable right now. Please try again later."));
        }
    }

    @Nested
    @SpringBootTest(properties = "madrasti.translation.per-user-per-minute=2")
    @AutoConfigureMockMvc
    @ActiveProfiles("test")
    @Import(WithStubTranslator.Stub.class)
    class WithStubTranslator {

        static final AtomicInteger CALLS = new AtomicInteger();

        @TestConfiguration
        static class Stub {
            @Bean
            Translator stubTranslator() {
                return (text, target) -> {
                    CALLS.incrementAndGet();
                    if (text.contains("interdit")) throw new Translator.RefusedException();
                    return "[" + target + "] " + text;
                };
            }
        }

        @Autowired
        MockMvc mvc;

        @Test
        void translatesCachesAndThrottlesPerUser() throws Exception {
            var auth = token(mvc);
            mvc.perform(get("/api/translate/status").header("Authorization", auth)).andExpect(jsonPath("$.enabled").value(true));

            var body = "{\"text\":\"Réunion samedi à 10h\",\"target\":\"ar\"}";
            for (var i = 0; i < 3; i++) {
                mvc.perform(post("/api/translate").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content(body))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.translation").value("[ar] Réunion samedi à 10h"));
            }
            assertThat(CALLS.get()).isEqualTo(1); // servi par le cache ensuite

            mvc.perform(post("/api/translate").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"text\":\"Sujet interdit\",\"target\":\"en\"}"))
                    .andExpect(status().isUnprocessableContent());
            mvc.perform(post("/api/translate").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"text\":\"Autre texte\",\"target\":\"en\"}"))
                    .andExpect(status().isConflict()); // quota de 2 appels par minute dépassé
        }
    }
}
