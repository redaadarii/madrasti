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

import java.lang.reflect.Method;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Parcours complet avec le CMI : formulaire signé, callback de serveur à serveur, retour du navigateur. */
@SpringBootTest(properties = {
        "madrasti.payments.provider=cmi",
        "madrasti.payments.public-url=https://ecole.example",
        "madrasti.payments.cmi.client-id=600000000",
        "madrasti.payments.cmi.store-key=STOREKEY-TEST"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CmiPaymentIntegrationTest {

    private static final String DIRECTOR = "direction@madrasti.ma";
    private static final String PARENT = "parent.adari@madrasti.ma";

    @Autowired
    MockMvc mvc;

    @Test
    void theCmiCallbackValidatesThePaymentOnlyWhenSignedAndApproved() throws Exception {
        var adam = studentId("Adari");
        Integer paymentId = JsonPath.read(body(send(DIRECTOR, post("/api/payments"),
                "{\"studentId\":%d,\"label\":\"Transport\",\"amount\":450,\"dueDate\":\"%s\"}".formatted(adam, LocalDate.now().plusDays(3)))), "$.id");

        var checkout = body(call(PARENT, post("/api/payments/{id}/checkout", paymentId))
                .andExpect(jsonPath("$.redirectUrl").value("https://testpayment.cmi.co.ma/fim/est3Dgate"))
                .andExpect(jsonPath("$.formFields.amount").value("450.00"))
                .andExpect(jsonPath("$.formFields.hash").isNotEmpty()));
        String oid = JsonPath.read(checkout, "$.formFields.oid");

        // Notification falsifiée : rejetée.
        callback(Map.of("oid", oid, "ProcReturnCode", "00", "HASH", "faux")).andExpect(content().string("FAILURE"));
        // Paiement refusé par la banque : accusé de réception, rien n'est validé.
        callback(signed(Map.of("oid", oid, "ProcReturnCode", "05", "Response", "Declined"))).andExpect(content().string("APPROVED"));
        confirm(oid).andExpect(jsonPath("$.status").value("PENDING"));

        callback(signed(Map.of("oid", oid, "ProcReturnCode", "00", "Response", "Approved", "amount", "450.00")))
                .andExpect(content().string("ACTION=POSTAUTH"));
        confirm(oid).andExpect(jsonPath("$.status").value("PAID")).andExpect(jsonPath("$.payment.method").value("ONLINE"));

        // Retour du navigateur (POST du CMI) : redirection vers la page de confirmation de l'application.
        mvc.perform(post("/api/public/payments/cmi/return").contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("oid", oid).param("ProcReturnCode", "00").param("HASH", "faux"))
                .andExpect(status().isSeeOther())
                .andExpect(header().string("Location", "https://ecole.example/payments/return?session=" + oid));
    }

    @Test
    void fromTheMobileAppAPublicPagePostsTheSignedFormAndTheBrowserEndsOnADonePage() throws Exception {
        var adam = studentId("Adari");
        Integer paymentId = JsonPath.read(body(send(DIRECTOR, post("/api/payments"),
                "{\"studentId\":%d,\"label\":\"Cantine\",\"amount\":300,\"dueDate\":\"%s\"}".formatted(adam, LocalDate.now().plusDays(3)))), "$.id");

        var checkout = body(call(PARENT, post("/api/payments/{id}/checkout", paymentId).param("client", "mobile"))
                .andExpect(jsonPath("$.formFields").doesNotExist()));
        String oid = JsonPath.read(checkout, "$.session");
        org.assertj.core.api.Assertions.assertThat((String) JsonPath.read(checkout, "$.redirectUrl"))
                .isEqualTo("https://ecole.example/api/public/payments/cmi/redirect/" + oid);

        // Page ouverte dans le navigateur du téléphone, sans session : formulaire signé vers le CMI.
        mvc.perform(get("/api/public/payments/cmi/redirect/{oid}", oid))
                .andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("action=\"https://testpayment.cmi.co.ma/fim/est3Dgate\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("name=\"hash\"")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("300.00 MAD")));
        mvc.perform(get("/api/public/payments/cmi/redirect/{oid}", "inconnu")).andExpect(status().isNotFound());

        callback(signed(Map.of("oid", oid, "ProcReturnCode", "00", "Response", "Approved")))
                .andExpect(content().string("ACTION=POSTAUTH"));
        mvc.perform(post("/api/public/payments/cmi/return").contentType(MediaType.APPLICATION_FORM_URLENCODED).param("oid", oid))
                .andExpect(header().string("Location", "https://ecole.example/api/public/payments/done?session=" + oid));
        mvc.perform(get("/api/public/payments/done")).andExpect(status().isOk())
                .andExpect(content().string(org.hamcrest.Matchers.containsString("revenir dans l'application")));

        // Paiement confirmé par l'application ; le lien de redirection ne sert plus.
        confirm(oid).andExpect(jsonPath("$.status").value("PAID"));
        mvc.perform(get("/api/public/payments/cmi/redirect/{oid}", oid)).andExpect(status().isNotFound());
    }

    private ResultActions callback(Map<String, String> params) throws Exception {
        var request = post("/api/public/payments/cmi/callback").contentType(MediaType.APPLICATION_FORM_URLENCODED);
        params.forEach(request::param);
        return mvc.perform(request).andExpect(status().isOk());
    }

    /** Signe comme le ferait le CMI, avec la même clé de magasin. */
    private static Map<String, String> signed(Map<String, String> params) throws Exception {
        Method hash = Class.forName("ma.madrasti.finance.online.CmiPaymentGateway").getDeclaredMethod("hash", Map.class, String.class);
        hash.setAccessible(true);
        var copy = new HashMap<>(params);
        copy.put("HASH", (String) hash.invoke(null, params, "STOREKEY-TEST"));
        return copy;
    }

    private ResultActions confirm(String session) throws Exception {
        return send(PARENT, post("/api/payments/online/confirm"), "{\"session\":\"%s\"}".formatted(session));
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
