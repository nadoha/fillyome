import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface VocabularyItem {
  id: string;
  word: string;
  language: string;
  definition: any;
}

interface QuizQuestion {
  word: VocabularyItem;
  options: string[];
  correctAnswer: string;
}

const Quiz = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadQuiz();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t("auth.loginRequired"));
      navigate("/auth");
    }
  };

  const loadQuiz = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      if (!data || data.length < 4) {
        toast.error("퀴즈를 만들기에 단어가 부족합니다 (최소 4개 필요)");
        navigate("/vocabulary");
        return;
      }

      // Create quiz questions
      const quizQuestions: QuizQuestion[] = data.map((word) => {
        const correctAnswer = getDefinitionText(word.definition);
        
        // Get 3 random wrong answers
        const wrongAnswers = data
          .filter((w) => w.id !== word.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((w) => getDefinitionText(w.definition));

        // Shuffle options
        const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

        return {
          word,
          options,
          correctAnswer,
        };
      });

      setQuestions(quizQuestions);
    } catch (error) {
      console.error("Failed to load quiz:", error);
      toast.error("퀴즈를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const getDefinitionText = (definition: any): string => {
    if (typeof definition === 'object' && definition.meanings && definition.meanings.length > 0) {
      return definition.meanings[0].definition;
    }
    return "정의 없음";
  };

  const handleAnswer = async (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === questions[currentIndex].correctAnswer;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Record result
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("quiz_results").insert({
          user_id: user.id,
          vocabulary_id: questions[currentIndex].word.id,
          was_correct: isCorrect,
          quiz_type: "multiple_choice",
        });
      }
    } catch (error) {
      console.error("Failed to record result:", error);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      toast.success(`퀴즈 완료! 정답률: ${Math.round((score.correct / score.total) * 100)}%`);
      navigate("/learn");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  }

  if (questions.length === 0) {
    return <div className="flex items-center justify-center min-h-screen">퀴즈가 없습니다</div>;
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/learn")}
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">퀴즈</h1>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>문제 {currentIndex + 1} / {questions.length}</span>
            <span>정답: {score.correct} / {score.total}</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Question */}
        <Card>
          <CardContent className="p-6">
            <p className="text-2xl font-bold text-center mb-6">
              {currentQuestion.word.word}
            </p>
            <p className="text-center text-muted-foreground mb-6">
              이 단어의 뜻은?
            </p>

            <div className="space-y-3">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedAnswer === option;
                const isCorrect = option === currentQuestion.correctAnswer;
                const showCorrect = showResult && isCorrect;
                const showWrong = showResult && isSelected && !isCorrect;

                return (
                  <Button
                    key={idx}
                    variant={showCorrect ? "default" : showWrong ? "destructive" : "outline"}
                    className="w-full h-auto p-4 text-left justify-start"
                    onClick={() => !showResult && handleAnswer(option)}
                    disabled={showResult}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {showResult && (
                        <>
                          {showCorrect && <CheckCircle className="h-5 w-5 flex-shrink-0" />}
                          {showWrong && <XCircle className="h-5 w-5 flex-shrink-0" />}
                        </>
                      )}
                      <span className="flex-1">{option}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Next Button */}
        {showResult && (
          <Button onClick={handleNext} className="w-full" size="lg">
            {currentIndex < questions.length - 1 ? "다음 문제" : "완료"}
          </Button>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Quiz;