package ma.madrasti.common;

/** Conflit métier ; {@code code} est une clé de messages*.properties, traduite selon Accept-Language. */
public class ConflictException extends RuntimeException {

    private final String code;
    private final transient Object[] args;

    public ConflictException(String code, Object... args) {
        super(code);
        this.code = code;
        this.args = args;
    }

    public String getCode() { return code; }
    public Object[] getArgs() { return args; }
}
