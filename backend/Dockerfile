# syntax=docker/dockerfile:1
# --- Build : dépendances en cache, puis extraction en couches Spring Boot ---
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /workspace
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -q dependency:go-offline
COPY src src
RUN --mount=type=cache,target=/root/.m2 mvn -B -q -DskipTests package \
 && java -Djarmode=tools -jar target/madrasti-backend.jar extract --layers --destination extracted

# --- Exécution : JRE seul, utilisateur non root ---
FROM eclipse-temurin:25-jre
# Polices pour la génération d'images de démonstration (AWT headless) ; curl pour le healthcheck.
RUN apt-get update \
 && apt-get install -y --no-install-recommends fontconfig fonts-dejavu-core curl \
 && rm -rf /var/lib/apt/lists/* \
 && useradd --system --uid 10001 --home /app madrasti \
 && mkdir -p /data/uploads && chown madrasti /data/uploads
WORKDIR /app
COPY --from=build /workspace/extracted/dependencies/ ./
COPY --from=build /workspace/extracted/spring-boot-loader/ ./
COPY --from=build /workspace/extracted/snapshot-dependencies/ ./
COPY --from=build /workspace/extracted/application/ ./
USER madrasti
ENV SPRING_PROFILES_ACTIVE=prod \
    MADRASTI_STORAGE_DIR=/data/uploads \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=60s --retries=5 \
  CMD curl -fsS http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java", "-jar", "madrasti-backend.jar"]
