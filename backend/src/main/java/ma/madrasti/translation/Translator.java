package ma.madrasti.translation;

/** Traduit un contenu saisi (annonce, message) vers une langue de l'interface. */
public interface Translator {

    enum Language {
        fr("French"), en("English"), ar("Modern Standard Arabic");

        final String englishName;

        Language(String englishName) {
            this.englishName = englishName;
        }
    }

    String translate(String text, Language target);

    /** Le fournisseur a refusé la demande (filtre de sécurité). */
    class RefusedException extends RuntimeException {
        public RefusedException() {
            super("translation refused");
        }
    }

    /** Fournisseur injoignable, saturé ou en erreur : réessayer plus tard. */
    class UnavailableException extends RuntimeException {
        public UnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
