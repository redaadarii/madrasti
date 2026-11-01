package ma.madrasti.sms;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/** Passerelle de développement : écrit le SMS dans les logs au lieu de l'envoyer. */
@Component
@ConditionalOnProperty(name = "madrasti.sms.provider", havingValue = "log", matchIfMissing = true)
class LogSmsGateway implements SmsGateway {

    private static final Logger log = LoggerFactory.getLogger(LogSmsGateway.class);

    @Override
    public void send(String to, String body) {
        log.info("[SMS simulé] → {} : {}", to, body);
    }
}
