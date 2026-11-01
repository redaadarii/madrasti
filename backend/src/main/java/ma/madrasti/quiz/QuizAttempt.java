package ma.madrasti.quiz;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.student.Student;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Quiz quiz;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Student student;

    /** Réponses sérialisées « 0,2,1 » (indice du choix par question). */
    @Column(nullable = false)
    private String answers;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private int total;

    @Column(nullable = false)
    private Instant submittedAt;

    protected QuizAttempt() {
    }

    public QuizAttempt(Quiz quiz, Student student, List<Integer> answers, Instant submittedAt) {
        this.quiz = quiz;
        this.student = student;
        this.answers = answers.stream().map(String::valueOf).collect(Collectors.joining(","));
        this.score = quiz.score(answers);
        this.total = quiz.getQuestions().size();
        this.submittedAt = submittedAt;
    }

    public List<Integer> answerList() {
        return Arrays.stream(answers.split(",")).map(Integer::valueOf).toList();
    }

    public Quiz getQuiz() { return quiz; }
    public Student getStudent() { return student; }
    public int getScore() { return score; }
    public int getTotal() { return total; }
    public Instant getSubmittedAt() { return submittedAt; }
}
