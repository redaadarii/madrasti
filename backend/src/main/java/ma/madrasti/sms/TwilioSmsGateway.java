package ma.madrasti.sms;

import ma.madrasti.config.MadrastiProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/** Envoi réel via l'API REST de Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM). */
@Component
@ConditionalOnProperty(name = "madrasti.sms.provider", havingValue = "twilio")
class TwilioSmsGateway implements SmsGateway {

    private final RestClient client;
    private final MadrastiProperties.Sms.Twilio config;

    TwilioSmsGateway(RestClient.Builder builder, MadrastiProperties properties) {
        this.config = properties.sms().twilio();
        if (config.accountSid().isBlank() || config.authToken().isBlank() || config.from().isBlank()) {
            throw new IllegalStateException("Twilio : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM sont requis");
        }
        this.client = builder.baseUrl("https://api.twilio.com/2010-04-01")
                .defaultHeaders(h -> h.setBasicAuth(config.accountSid(), config.authToken()))
                .build();
    }

    @Override
    public void send(String to, String body) throws SmsException {
        var form = new LinkedMultiValueMap<String, String>();
        form.add("To", to);
        form.add("From", config.from());
        form.add("Body", body);
        try {
            client.post().uri("/Accounts/{sid}/Messages.json", config.accountSid())
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .toBodilessEntity();
        } catch (RestClientException e) {
            throw new SmsException("Échec Twilio : " + e.getMessage(), e);
        }
    }
}
