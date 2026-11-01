package ma.madrasti.quiz;

import jakarta.persistence.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quiz_questions")
public class QuizQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Quiz quiz;

    @Column(nullable = false)
    private int position;

    @Column(nullable = false)
    private String prompt;

    @ElementCollection
    @CollectionTable(name = "quiz_choices", joinColumns = @JoinColumn(name = "question_id"))
    @OrderColumn(name = "position")
    @Column(name = "label", nullable = false)
    private List<String> choices = new ArrayList<>();

    @Column(nullable = false)
    private int correctIndex;

    protected QuizQuestion() {
    }

    QuizQuestion(Quiz quiz, int position, String prompt, List<String> choices, int correctIndex) {
        this.quiz = quiz;
        this.position = position;
        this.prompt = prompt;
        this.choices = new ArrayList<>(choices);
        this.correctIndex = correctIndex;
    }

    public Long getId() { return id; }
    public String getPrompt() { return prompt; }
    public List<String> getChoices() { return choices; }
    public int getCorrectIndex() { return correctIndex; }
}
