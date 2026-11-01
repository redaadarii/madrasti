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

import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LocalizationIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void errorsFollowTheAcceptLanguageHeader() throws Exception {
        var badLogin = """
                {"email":"admin@madrasti.ma","password":"nope-nope"}""";
        mvc.perform(post("/api/auth/login").header("Accept-Language", "en").contentType(MediaType.APPLICATION_JSON).content(badLogin))
                .andExpect(jsonPath("$.detail").value("Incorrect email or password"));
        mvc.perform(post("/api/auth/login").header("Accept-Language", "ar").contentType(MediaType.APPLICATION_JSON).content(badLogin))
                .andExpect(jsonPath("$.detail").value("البريد الإلكتروني أو كلمة المرور غير صحيحة"));
        mvc.perform(post("/api/auth/login").header("Accept-Language", "de").contentType(MediaType.APPLICATION_JSON).content(badLogin))
                .andExpect(jsonPath("$.detail").value("Email ou mot de passe incorrect"));
    }

    @Test
    void validationAndConflictsAreTranslated() throws Exception {
        var admin = token();
        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer " + admin).header("Accept-Language", "ar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"x@madrasti.ma","password":"court","firstName":"A","lastName":"B","role":"PARENT"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("بيانات غير صالحة"))
                .andExpect(jsonPath("$.errors.password").value("8 أحرف على الأقل"));
        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer " + admin).header("Accept-Language", "en")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"direction@madrasti.ma","password":"MotDePasse1","firstName":"A","lastName":"B","role":"PARENT"}"""))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("An account already exists with this email"));
    }

    @Test
    void everyLanguageDefinesTheSameMessageKeys() throws IOException {
        var fr = load("messages.properties").stringPropertyNames();
        assertThat(load("messages_en.properties").stringPropertyNames()).isEqualTo(fr);
        assertThat(load("messages_ar.properties").stringPropertyNames()).isEqualTo(fr);
    }

    private static Properties load(String name) throws IOException {
        var properties = new Properties();
        try (var in = LocalizationIntegrationTest.class.getClassLoader().getResourceAsStream(name)) {
            properties.load(new InputStreamReader(in, StandardCharsets.UTF_8));
        }
        return properties;
    }

    private String token() throws Exception {
        var body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@madrasti.ma\",\"password\":\"%s\"}".formatted(DemoDataSeeder.DEMO_PASSWORD)))
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.accessToken");
    }
}
