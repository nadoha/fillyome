import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { QuestionSourceLabel, SourceType } from "@/components/learn/QuestionSourceLabel";
import { EmotionalFeedback } from "@/components/learn/EmotionalFeedback";
import { RewardModal } from "@/components/learn/RewardModal";
import { LoginPrompt } from "@/components/learn/LoginPrompt";
import { JapaneseText } from "@/components/learn/JapaneseText";
import { useLearningUnlock } from "@/hooks/useLearningUnlock";
import { useStreak } from "@/hooks/useStreak";
import { speakText } from "@/utils/speechUtils";
import { 
  ArrowLeft, CheckCircle, XCircle, RefreshCw, Volume2, 
  Sparkles, Target, HelpCircle
} from "lucide-react";
import { toast } from "sonner";

interface LearningQuestion {
  question_type: "fill_blank" | "meaning_choice" | "word_order";
  source_type: SourceType;
  source_label: string;
  difficulty_level: string;
  question_text: string;
  question_data: {
    options?: string[];
    correct_answer: string;
    words?: string[];
    blank_position?: number;
    original_sentence?: string;
    romaji?: string;
    furigana?: string;
  };
  source_lang: string;
  target_lang: string;
}

const MicroLesson = () => {
  const navigate = useNavigate();
  const { streak, refreshStreak } = useStreak();
  const { updateQuizStats, jlptLevel } = useLearningUnlock();
  
  const [questions, setQuestions] = useState<LearningQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0, skipped: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const sessionStartTime = useRef<Date>(new Date());

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      // Use cached queue endpoint (no real-time AI generation)
      const { data, error } = await supabase.functions.invoke("get-learning-questions", {
        body: { questionCount: 5 },
      });

      if (error) throw error;

      // Check if queue needs replenishment (background, non-blocking)
      if (data?.queueStatus?.needsReplenishment) {
        // Fire and forget - don't await
        supabase.functions.invoke("replenish-question-queue", {
          body: { targetQueueSize: 10 },
        }).catch(console.error);
      }

      if (!data?.questions || data.questions.length === 0) {
        // No cached questions - trigger generation and show message
        supabase.functions.invoke("replenish-question-queue", {
          body: { targetQueueSize: 10 },
        }).catch(console.error);
        
        toast.info("문제를 준비 중이에요. 잠시 후 다시 시도해주세요!");
        navigate("/learn");
        return;
      }

      setQuestions(data.questions);
    } catch (error) {
      console.error("Failed to load questions:", error);
      toast.error("문제를 불러오는데 실패했습니다");
      navigate("/learn");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    speakText(text, lang, { rate: 0.9 });
  };

  const handleAnswer = async (answer: string, isDontKnow: boolean = false) => {
    setSelectedAnswer(answer);
    setShowResult(true);

    const currentQuestion = questions[currentIndex];
    const isCorrect = !isDontKnow && answer === currentQuestion.question_data.correct_answer;
    setLastAnswerCorrect(isDontKnow ? null : isCorrect);

    setScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
      skipped: prev.skipped + (isDontKnow ? 1 : 0),
    }));

    // Update user's learning stats (skip doesn't count as wrong for stats)
    if (!isDontKnow) {
      await updateQuizStats(isCorrect);
    }

    // Play pronunciation
    handleSpeak(currentQuestion.question_text, currentQuestion.source_lang);

    // Record result
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("quiz_results").insert({
          user_id: user.id,
          vocabulary_id: null,
          was_correct: isCorrect,
          quiz_type: isDontKnow ? "micro_lesson_skip" : "micro_lesson",
        });
      }
    } catch (error) {
      console.error("Failed to record result:", error);
    }
  };

  const handleDontKnow = async () => {
    const currentQuestion = questions[currentIndex];
    setSelectedAnswer(currentQuestion.question_data.correct_answer);
    await handleAnswer(currentQuestion.question_data.correct_answer, true);
  };

  const updateLearningSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const durationMinutes = Math.round(
        (new Date().getTime() - sessionStartTime.current.getTime()) / 60000
      );
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

  // Check if text is Japanese
  const isJapanese = (lang: string) => lang === "ja";

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">맞춤 학습 문제 생성 중...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="container max-w-lg mx-auto px-5 py-6">
            <header className="flex items-center gap-3 mb-8">
              <Button variant="ghost" size="icon" onClick={() => navigate("/learn")} className="shrink-0 -ml-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">마이크로 학습</h1>
            </header>
            <LoginPrompt 
              title="학습 기능 사용하기"
              description="학습 기능을 사용하려면 계정 연결이 필요해요"
            />
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="container max-w-lg mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/learn")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">마이크로 학습</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3" />
                  {jlptLevel} 수준
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="font-medium">{questions.length}문제</span>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>문제 {currentIndex + 1} / {questions.length}</span>
              <span>정답: {score.correct} / {score.total - score.skipped}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Question Card */}
          <Card className="overflow-hidden">
            {/* Source Label */}
            <div className="bg-muted/50 p-3 flex items-center justify-between">
              <QuestionSourceLabel sourceType={currentQuestion.source_type} />
              <span className="text-xs text-muted-foreground">
                {currentQuestion.source_lang.toUpperCase()} → {currentQuestion.target_lang.toUpperCase()}
              </span>
            </div>

            <CardContent className="p-6">
              {/* Question Type Indicator */}
              <div className="text-center mb-4">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                  {currentQuestion.question_type === "fill_blank" && "빈칸 채우기"}
                  {currentQuestion.question_type === "meaning_choice" && "의미 선택"}
                  {currentQuestion.question_type === "word_order" && "어순 배열"}
                </span>
              </div>

              {/* Question Text with Japanese text hierarchy */}
              <div className="flex flex-col items-center gap-3 mb-6">
                {isJapanese(currentQuestion.source_lang) ? (
                  <JapaneseText
                    text={currentQuestion.question_text}
                    romaji={currentQuestion.question_data.romaji}
                    furigana={currentQuestion.question_data.furigana}
                    size="lg"
                    showFurigana={true}
                    showRomaji={true}
                  />
                ) : (
                  <p className="text-2xl font-bold text-center leading-relaxed">
                    {currentQuestion.question_text}
                  </p>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSpeak(
                    currentQuestion.question_data.original_sentence || currentQuestion.question_text,
                    currentQuestion.source_lang
                  )}
                >
                  <Volume2 className="h-5 w-5" />
                </Button>
              </div>

              <p className="text-center text-muted-foreground mb-6">
                {currentQuestion.question_type === "fill_blank" && "빈칸에 들어갈 단어를 고르세요"}
                {currentQuestion.question_type === "meaning_choice" && "알맞은 의미를 고르세요"}
                {currentQuestion.question_type === "word_order" && "올바른 순서로 배열하세요"}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.question_data.options?.map((option, idx) => {
                  const isSelected = selectedAnswer === option;
                  const isCorrect = option === currentQuestion.question_data.correct_answer;
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
                            {showCorrect && <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary-foreground" />}
                            {showWrong && <XCircle className="h-5 w-5 flex-shrink-0" />}
                          </>
                        )}
                        <span className="flex-1 break-words">{option}</span>
                      </div>
                    </Button>
                  );
                })}

                {/* "모르겠어요" option - only show before answering */}
                {!showResult && (
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-3 text-muted-foreground hover:text-foreground justify-center gap-2"
                    onClick={handleDontKnow}
                  >
                    <HelpCircle className="h-4 w-4" />
                    모르겠어요
                  </Button>
                )}
              </div>

              {/* Show original sentence for fill_blank */}
              {showResult && currentQuestion.question_type === "fill_blank" && currentQuestion.question_data.original_sentence && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">원래 문장:</p>
                  <p className="font-medium">{currentQuestion.question_data.original_sentence}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emotional Feedback (not shown for skipped) */}
          {showResult && lastAnswerCorrect !== null && <EmotionalFeedback isCorrect={lastAnswerCorrect} />}

          {/* Skipped message */}
          {showResult && lastAnswerCorrect === null && (
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                괜찮아요! 다음에 다시 연습해봐요 💪
              </p>
            </div>
          )}

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
        totalQuestions={score.total - score.skipped}
        streakMaintained={true}
        newStreak={streak + 1}
      />

      <BottomNavigation />
    </div>
  );
};

export default MicroLesson;
