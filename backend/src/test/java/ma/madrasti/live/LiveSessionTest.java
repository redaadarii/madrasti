package ma.madrasti.live;

import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class LiveSessionTest {

    private static final Instant START = Instant.parse("2026-11-02T09:00:00Z");
    private final LiveSession session = new LiveSession(null, null, "Maths", "Révisions", START, 60, LiveProvider.JITSI, "https://x");

    @Test
    void roomOpensTenMinutesEarlyAndClosesAtTheEnd() {
        assertThat(session.status(START.minus(Duration.ofMinutes(11)))).isEqualTo(LiveSession.Status.UPCOMING);
        assertThat(session.status(START.minus(Duration.ofMinutes(10)))).isEqualTo(LiveSession.Status.LIVE);
        assertThat(session.status(START.plus(Duration.ofMinutes(59)))).isEqualTo(LiveSession.Status.LIVE);
        assertThat(session.status(START.plus(Duration.ofMinutes(60)))).isEqualTo(LiveSession.Status.ENDED);
    }

    @Test
    void jitsiRoomNamesAreUniqueAndUrlSafe() {
        var first = LiveSessionController.jitsiRoom("https://meet.jit.si/", "CM1-B");
        assertThat(first).matches("https://meet\\.jit\\.si/Madrasti-CM1B-[0-9a-f]{16}");
        assertThat(LiveSessionController.jitsiRoom("https://meet.jit.si/", "CM1-B")).isNotEqualTo(first);
    }
}
