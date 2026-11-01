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

import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Paiement en ligne avec le prestataire simulé (même parcours qu'avec Stripe). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class OnlinePaymentIntegrationTest {

    private static final String DIRECTOR = "direction@madrasti.ma";
    private static final String PARENT = "parent.adari@madrasti.ma";
    private static final String OTHER_PARENT = "parent.berrada@madrasti.ma";

    @Autowired
    MockMvc mvc;

    @Test
    void aParentPaysAnInstalmentOnlineAndTheSchoolSeesItPaid() throws Exception {
        var adam = studentId("Adari");
        Integer paymentId = JsonPath.read(body(send(DIRECTOR, post("/api/payments"),
                "{\"studentId\":%d,\"label\":\"Sortie scolaire\",\"amount\":120.5,\"dueDate\":\"%s\"}".formatted(adam, LocalDate.now().plusDays(10)))
                .andExpect(status().isCreated())), "$.id");

        call(PARENT, get("/api/payments/online")).andExpect(jsonPath("$.provider").value("simulated"));
        call(OTHER_PARENT, post("/api/payments/{id}/checkout", paymentId)).andExpect(status().isNotFound());
        call(DIRECTOR, post("/api/payments/{id}/checkout", paymentId)).andExpect(status().isForbidden());

        String redirect = JsonPath.read(body(call(PARENT, post("/api/payments/{id}/checkout", paymentId))
                .andExpect(jsonPath("$.redirectUrl", startsWith("http://localhost:5173/pay/simulated?session=sim_")))
                .andExpect(jsonPath("$.session", startsWith("sim_")))), "$.redirectUrl");
        var session = redirect.substring(redirect.indexOf("session=") + 8);

        call(PARENT, get("/api/payments/online/sessions/{s}", session))
                .andExpect(jsonPath("$.label").value("Sortie scolaire"))
                .andExpect(jsonPath("$.status").value("PENDING"));
        call(OTHER_PARENT, get("/api/payments/online/sessions/{s}", session)).andExpect(status().isNotFound());

        // Revenir sur la page de retour sans avoir payé ne change rien.
        confirm(PARENT, session).andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.payment.status").value("PENDING"));

        call(PARENT, post("/api/payments/online/sessions/{s}/simulate", session)).andExpect(status().isOk());
        confirm(PARENT, session)
                .andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.payment.method").value("ONLINE"))
                .andExpect(jsonPath("$.payment.status").value("PAID"));
        // Idempotent, et l'échéance réglée ne peut plus être payée.
        confirm(PARENT, session).andExpect(jsonPath("$.status").value("PAID"));
        call(PARENT, post("/api/payments/{id}/checkout", paymentId)).andExpect(status().isConflict());
        confirm(OTHER_PARENT, session).andExpect(status().isNotFound());

        call(DIRECTOR, get("/api/payments/student/{id}", adam))
                .andExpect(jsonPath("$[?(@.id == %d)].method".formatted(paymentId)).value("ONLINE"));
    }

    @Test
    void simultaneousConfirmationsMarkThePaymentPaidOnlyOnce() throws Exception {
        var adam = studentId("Adari");
        var label = "Cantine " + System.nanoTime();
        Integer paymentId = JsonPath.read(body(send(DIRECTOR, post("/api/payments"),
                "{\"studentId\":%d,\"label\":\"%s\",\"amount\":300,\"dueDate\":\"%s\"}".formatted(adam, label, LocalDate.now().plusDays(5)))), "$.id");
        String redirect = JsonPath.read(body(call(PARENT, post("/api/payments/{id}/checkout", paymentId))), "$.redirectUrl");
        var session = redirect.substring(redirect.indexOf("session=") + 8);
        call(PARENT, post("/api/payments/online/sessions/{s}/simulate", session)).andExpect(status().isOk());

        // Double clic sur la page de retour : deux confirmations en parallèle.
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var first = pool.submit(() -> confirm(PARENT, session).andReturn().getResponse().getStatus());
            var second = pool.submit(() -> confirm(PARENT, session).andReturn().getResponse().getStatus());
            org.assertj.core.api.Assertions.assertThat(List.of(first.get(), second.get())).containsOnly(200);
        }
        call("admin@madrasti.ma", get("/api/admin/audit").param("action", "PAYMENT_ONLINE").param("q", label))
                .andExpect(jsonPath("$.totalElements").value(1));
    }

    private ResultActions confirm(String email, String session) throws Exception {
        return send(email, post("/api/payments/online/confirm"), "{\"session\":\"%s\"}".formatted(session));
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
