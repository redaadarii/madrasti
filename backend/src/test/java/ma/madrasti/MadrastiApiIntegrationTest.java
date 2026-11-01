package ma.madrasti;

import ma.madrasti.config.DemoDataSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.greaterThan;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class MadrastiApiIntegrationTest {

    @Autowired
    MockMvc mvc;

    @Test
    void rejectsAnonymousCalls() throws Exception {
        mvc.perform(get("/api/dashboard")).andExpect(status().isUnauthorized());
    }

    @Test
    void rejectsWrongPasswordWithProblemDetail() throws Exception {
        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@madrasti.ma","password":"wrong-password"}"""))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Email ou mot de passe incorrect"));
    }

    @Test
    void adminCanCreateAccountAndNewUserCanLogIn() throws Exception {
        var admin = token("admin@madrasti.ma");

        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"Nouveau.Prof@madrasti.ma","password":"MotDePasse1","firstName":"Hamza",
                                 "lastName":"Kettani","role":"TEACHER","schoolId":1}"""))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.email").value("nouveau.prof@madrasti.ma"))
                .andExpect(jsonPath("$.role").value("TEACHER"));

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"nouveau.prof@madrasti.ma","password":"MotDePasse1"}"""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.firstName").value("Hamza"));
    }

    @Test
    void rejectsDuplicateEmailAndInvalidPayload() throws Exception {
        var admin = token("admin@madrasti.ma");

        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"direction@madrasti.ma","password":"MotDePasse1","firstName":"A",
                                 "lastName":"B","role":"DIRECTOR"}"""))
                .andExpect(status().isConflict());

        mvc.perform(post("/api/admin/users").header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"pas-un-email","password":"court","firstName":"","lastName":"B","role":"PARENT"}"""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.email").exists())
                .andExpect(jsonPath("$.errors.password").value("8 caractères minimum"));
    }

    @Test
    void parentSeesOnlyOwnChildren() throws Exception {
        var parent = token("parent.adari@madrasti.ma");

        mvc.perform(get("/api/students/mine").header("Authorization", "Bearer " + parent))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].lastName").value("Adari"));
        mvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + parent))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/grades").param("studentId", "12").header("Authorization", "Bearer " + parent))
                .andExpect(status().isForbidden());
    }

    @Test
    void dashboardExposesSchoolIndicators() throws Exception {
        mvc.perform(get("/api/dashboard").header("Authorization", "Bearer " + token("direction@madrasti.ma")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.students").value(12))
                .andExpect(jsonPath("$.classrooms").value(3))
                .andExpect(jsonPath("$.collected").value(greaterThan(0.0)));
    }

    private String token(String email) throws Exception {
        var body = mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, DemoDataSeeder.DEMO_PASSWORD)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.read(body, "$.accessToken");
    }
}
