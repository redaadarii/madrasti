package ma.madrasti.quiz;

import jakarta.persistence.*;
import ma.madrasti.common.BaseEntity;
import ma.madrasti.school.Classroom;
import ma.madrasti.user.User;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/** QCM publié pour une classe, corrigé automatiquement. */
@Entity
@Table(name = "quizzes")
public class Quiz extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Classroom classroom;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private User teacher;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private LocalDate dueDate;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position")
    private List<QuizQuestion> questions = new ArrayList<>();

    protected Quiz() {
    }

    public Quiz(Classroom classroom, User teacher, String subject, String title, LocalDate dueDate) {
        this.classroom = classroom;
        this.teacher = teacher;
        this.subject = subject;
        this.title = title;
        this.dueDate = dueDate;
    }

    public void addQuestion(String prompt, List<String> choices, int correctIndex) {
        questions.add(new QuizQuestion(this, questions.size(), prompt, choices, correctIndex));
    }

    /** Nombre de bonnes réponses ; {@code answers[i]} est l'indice du choix pour la question i. */
    public int score(List<Integer> answers) {
        var score = 0;
        for (var i = 0; i < questions.size(); i++) {
            if (questions.get(i).getCorrectIndex() == answers.get(i)) {
                score++;
            }
        }
        return score;
    }

    public Classroom getClassroom() { return classroom; }
    public User getTeacher() { return teacher; }
    public String getSubject() { return subject; }
    public String getTitle() { return title; }
    public LocalDate getDueDate() { return dueDate; }
    public List<QuizQuestion> getQuestions() { return questions; }
}
