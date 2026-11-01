package ma.madrasti.config;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sérialise les données de démonstration entre répliques : au premier démarrage, plusieurs instances
 * partagent la même base vide. Le verrou de ligne est tenu jusqu'à la fin de la transaction du seeder ;
 * l'instance suivante voit alors les données validées et ne les recrée pas.
 */
@Component
public class SeedLock {

    private final JdbcClient jdbc;

    public SeedLock(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void acquire() {
        jdbc.sql("SELECT name FROM app_locks WHERE name = 'demo-seed' FOR UPDATE").query(String.class).single();
    }
}
