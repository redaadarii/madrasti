package ma.madrasti.translation;

import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import ma.madrasti.config.MadrastiProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

/** Traduction automatique activée seulement si une clé API Anthropic est fournie (ANTHROPIC_API_KEY). */
@Configuration
@ConditionalOnExpression("!'${madrasti.translation.api-key:}'.isBlank()")
class TranslationConfig {

    @Bean
    Translator claudeTranslator(MadrastiProperties properties) {
        var config = properties.translation();
        var client = AnthropicOkHttpClient.builder()
                .apiKey(config.apiKey())
                .timeout(Duration.ofSeconds(60))
                .maxRetries(2)
                .build();
        return new ClaudeTranslator(client, config.model(), config.effort());
    }
}
