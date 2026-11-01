package ma.madrasti.sms;

/** Fournisseur d'envoi de SMS (Twilio en production, journal en développement). */
public interface SmsGateway {

    void send(String to, String body) throws SmsException;

    class SmsException extends Exception {
        public SmsException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
