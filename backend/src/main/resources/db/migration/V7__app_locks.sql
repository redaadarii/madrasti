-- Verrous applicatifs (ex. données de démonstration créées par une seule réplique à la fois)
CREATE TABLE app_locks (
    name VARCHAR(40) PRIMARY KEY
);
INSERT INTO app_locks (name) VALUES ('demo-seed');
