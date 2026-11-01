package ma.madrasti.notification;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RedisNotificationRelayTest {

    @Test
    void envelopeRoundTripsThroughTheChannelPayload() {
        var envelope = new RedisNotificationRelay.Envelope(42, 1337);
        assertThat(envelope.encode()).isEqualTo("42:1337");
        assertThat(RedisNotificationRelay.Envelope.decode("42:1337")).isEqualTo(envelope);
    }
}
