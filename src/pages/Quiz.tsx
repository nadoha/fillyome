import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ArrowLeft, CheckCircle, XCircle, Volume2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { EmotionalFeedback } from "@/components/learn/EmotionalFeedback";
import { RewardModal } from "@/components/learn/RewardModal";
import { useStreak } from "@/hooks/useStreak";
import { speakText } from "@/utils/speechUtils";

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
  const { streak, refreshStreak } = useStreak();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const sessionStartTime = useRef<Date>(new Date());

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

  const handleSpeak = (text: string, lang: string) => {
    speakText(text, lang, { rate: 0.9 });
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
        .limit(7);

      if (error) throw error;

      if (!data || data.length < 4) {
        toast.error("퀴즈를 만들기에 단어가 부족합니다 (최소 4개 필요)");
        navigate("/vocabulary");
        return;
      }

      const quizQuestions: QuizQuestion[] = data.map((word) => {
        const correctAnswer = getDefinitionText(word.definition);
        const wrongAnswers = data
          .filter((w) => w.id !== word.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((w) => getDefinitionText(w.definition));
        const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);
        return { word, options, correctAnswer };
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

  const updateLearningSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const durationMinutes = Math.round((new Date().getTime() - sessionStartTime.current.getTime()) / 60000);
      const today = new Date().toISOString().split("T")[0];

      const { data: existingSession } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle();

      if (existingSession) {
        await supabase.from("learning_sessions").update({
          study_duration_minutes: (existingSession.study_duration_minutes || 0) + durationMinutes,
          total_answers: (existingSession.total_answers || 0) + score.total + 1,
          correct_answers: (existingSession.correct_answers || 0) + score.correct,
          words_studied: (existingSession.words_studied || 0) + questions.length,
        }).eq("id", existingSession.id);
      } else {
        await supabase.from("learning_sessions").insert({
          user_id: user.id,
          session_date: today,
          study_duration_minutes: durationMinutes,
          total_answers: score.total + 1,
          correct_answers: score.correct,
          words_studied: questions.length,
        });
      }
      refreshStreak();
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  };

  const handleAnswer = async (answer: string) => {
    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === questions[currentIndex].correctAnswer;
    setLastAnswerCorrect(isCorrect);
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Play word pronunciation
    const currentWord = questions[currentIndex].word;
    handleSpeak(currentWord.word, currentWord.language);

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

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setLastAnswerCorrect(null);
    } else {
      await updateLearningSession();
      setShowRewardModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">퀴즈 생성 중...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">퀴즈가 없습니다</p>
        <Button onClick={() => navigate("/learn")}>돌아가기</Button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/learn")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">단어장 퀴즈</h1>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>문제 {currentIndex + 1} / {questions.length}</span>
              <span>정답: {score.correct} / {score.total}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                {currentQuestion.word.language}
              </p>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center justify-center gap-3 mb-2">
                <p className="text-3xl font-bold text-center">
                  {currentQuestion.word.word}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSpeak(currentQuestion.word.word, currentQuestion.word.language)}
                >
                  <Volume2 className="h-5 w-5" />
                </Button>
              </div>
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
                      className="w-full h-auto p-4 text-left justify-start transition-all"
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

          {/* Emotional Feedback */}
          {showResult && <EmotionalFeedback isCorrect={lastAnswerCorrect} />}

          {/* Next Button */}
          {showResult && (
            <Button onClick={handleNext} className="w-full" size="lg">
              {currentIndex < questions.length - 1 ? "다음 문제" : "완료"}
            </Button>
          )}
        </div>
      </div>

      <RewardModal
        isOpen={showRewardModal}
        onClose={() => {
          setShowRewardModal(false);
          navigate("/learn");
        }}
        score={score.correct}
        totalQuestions={score.total}
        streakMaintained={true}
        newStreak={streak + 1}
      />

      <BottomNavigation />
    </div>
  );
};

export default Quiz;
