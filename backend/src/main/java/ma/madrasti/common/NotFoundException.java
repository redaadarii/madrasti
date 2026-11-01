package ma.madrasti.common;

/** Ressource introuvable ; {@code resource} est une clé traduite via {@code resource.<clé>} dans messages*.properties. */
public class NotFoundException extends RuntimeException {

    private final String resource;
    private final transient Object id;

    public NotFoundException(String resource, Object id) {
        super("%s not found (id=%s)".formatted(resource, id));
        this.resource = resource;
        this.id = id;
    }

    public String getResource() { return resource; }
    public Object getId() { return id; }
}
