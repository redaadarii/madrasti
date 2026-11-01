package ma.madrasti.quiz;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class QuizTest {

    @Test
    void scoresOnePointPerCorrectAnswer() {
        var quiz = new Quiz(null, null, "Maths", "Tables", LocalDate.of(2026, 11, 1));
        quiz.addQuestion("2 × 3 ?", List.of("5", "6"), 1);
        quiz.addQuestion("4 × 4 ?", List.of("16", "8"), 0);

        assertThat(quiz.score(List.of(1, 0))).isEqualTo(2);
        assertThat(quiz.score(List.of(0, 0))).isEqualTo(1);
    }
}
