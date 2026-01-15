import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ArrowLeft, CheckCircle, XCircle, Shuffle, RefreshCw, Sparkles, AlertTriangle, CheckCircle2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EmotionalFeedback } from "@/components/learn/EmotionalFeedback";
import { RewardModal } from "@/components/learn/RewardModal";
import { useStreak } from "@/hooks/useStreak";

interface FrequentWord {
  word: string;
  translation: string;
  source_lang: string;
  target_lang: string;
  count: number;
}

interface QuizQuestion {
  word: string;
  options: string[];
  correctAnswer: string;
  source_lang: string;
  target_lang: string;
}

interface VerificationResult {
  isValid: boolean;
  issues: string[];
  suggestion: string | null;
  confidence: number;
}

const TranslationQuiz = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { streak, refreshStreak } = useStreak();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [wrongAnswers, setWrongAnswers] = useState<QuizQuestion[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const sessionStartTime = useRef<Date>(new Date());

  useEffect(() => {
    checkAuth();
    loadTranslationQuiz();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t("auth.loginRequired"));
      navigate("/auth");
    }
  };

  const speakWord = async (text: string, lang: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, language: lang, speed: 0.9 }
      });

      if (error) throw error;
      if (data?.audioContent) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        await audio.play();
        return;
      }
    } catch (err) {
      console.log('TTS fallback to browser');
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "zh-CN";
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  const extractWords = (text: string): string[] => {
    return text
      .split(/[\s,.\-!?;:'"()[\]{}\/\\]+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 2 && w.length <= 30);
  };

  const loadTranslationQuiz = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: translations, error } = await supabase
        .from("translations")
        .select("source_text, target_text, source_lang, target_lang")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!translations || translations.length < 4) {
        toast.error("퀴즈를 만들기에 번역 기록이 부족합니다 (최소 4개 필요)");
        navigate("/learn");
        return;
      }

      const wordMap = new Map<string, FrequentWord>();

      translations.forEach((t) => {
        const sourceWords = extractWords(t.source_text);
        const targetWords = extractWords(t.target_text);

        if (sourceWords.length > 0 && targetWords.length > 0) {
          const key = `${sourceWords[0]}_${t.source_lang}`;
          const existing = wordMap.get(key);
          
          if (existing) {
            existing.count++;
          } else {
            wordMap.set(key, {
              word: sourceWords[0],
              translation: targetWords.slice(0, 3).join(" "),
              source_lang: t.source_lang,
              target_lang: t.target_lang,
              count: 1,
            });
          }
        }
      });

      const frequentWords = Array.from(wordMap.values())
        .filter(w => w.count >= 1)
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      if (frequentWords.length < 4) {
        toast.error("충분한 단어가 없습니다. 더 많은 번역을 해보세요!");
        navigate("/learn");
        return;
      }

      const shuffled = frequentWords.sort(() => Math.random() - 0.5).slice(0, 5);

      const quizQuestions: QuizQuestion[] = shuffled.map((word) => {
        const correctAnswer = word.translation;
        const wrongAnswers = frequentWords
          .filter((w) => w.word !== word.word)
          .sort(() => Math.random() - 0.5)
          .slice(0, 3)
          .map((w) => w.translation);
        const options = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5);

        return {
          word: word.word,
          options,
          correctAnswer,
          source_lang: word.source_lang,
          target_lang: word.target_lang,
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

    const currentQuestion = questions[currentIndex];
    const isCorrect = answer === currentQuestion.correctAnswer;
    setLastAnswerCorrect(isCorrect);
    
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Play pronunciation
    speakWord(currentQuestion.word, currentQuestion.source_lang);

    if (!isCorrect) {
      setWrongAnswers(prev => [...prev, currentQuestion]);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("quiz_results").insert({
          user_id: user.id,
          vocabulary_id: null,
          was_correct: isCorrect,
          quiz_type: "translation_quiz",
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
      setVerification(null);
      setLastAnswerCorrect(null);
    } else {
      if (wrongAnswers.length > 0) {
        sessionStorage.setItem("lastWrongAnswers", JSON.stringify(wrongAnswers));
      }
      await updateLearningSession();
      setShowRewardModal(true);
    }
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore({ correct: 0, total: 0 });
    setWrongAnswers([]);
    setIsLoading(true);
    setVerification(null);
    setLastAnswerCorrect(null);
    sessionStartTime.current = new Date();
    loadTranslationQuiz();
  };

  const verifyQuestion = async () => {
    const currentQuestion = questions[currentIndex];
    setIsVerifying(true);
    setVerification(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-quiz', {
        body: {
          question: currentQuestion.word,
          options: currentQuestion.options,
          correctAnswer: currentQuestion.correctAnswer,
          sourceLang: currentQuestion.source_lang,
          targetLang: currentQuestion.target_lang,
        },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      setVerification(data);
      if (data.isValid) {
        toast.success("이 문제는 정확합니다! ✓");
      } else {
        toast.warning("문제에 이슈가 발견되었습니다");
      }
    } catch (error) {
      console.error("Verification failed:", error);
      toast.error("검증 중 오류가 발생했습니다");
    } finally {
      setIsVerifying(false);
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
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/learn")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">번역 퀴즈</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRetry}>
            <Shuffle className="h-5 w-5" />
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>문제 {currentIndex + 1} / {questions.length}</span>
            <span>정답: {score.correct} / {score.total}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {currentQuestion.source_lang} → {currentQuestion.target_lang}
            </p>
          </div>
          <CardContent className="p-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <p className="text-3xl font-bold text-center">
                {currentQuestion.word}
              </p>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => speakWord(currentQuestion.word, currentQuestion.source_lang)}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-center text-muted-foreground mb-6">
              이 단어의 번역은?
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
                          {showCorrect && <CheckCircle className="h-5 w-5 flex-shrink-0 text-primary-foreground" />}
                          {showWrong && <XCircle className="h-5 w-5 flex-shrink-0" />}
                        </>
                      )}
                      <span className="flex-1 break-words">{option}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Emotional Feedback */}
        {showResult && <EmotionalFeedback isCorrect={lastAnswerCorrect} />}

        {/* AI Verification Button */}
        <Button
          variant="outline"
          onClick={verifyQuestion}
          disabled={isVerifying}
          className="w-full gap-2"
        >
          {isVerifying ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              AI 검증 중...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              AI로 문제 검증하기
            </>
          )}
        </Button>

        {/* Verification Result */}
        {verification && (
          <Alert variant={verification.isValid ? "default" : "destructive"}>
            {verification.isValid ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle>
              {verification.isValid ? "문제 검증 완료" : "문제 발견"}
            </AlertTitle>
            <AlertDescription>
              {verification.isValid ? (
                <p>이 문제는 정확합니다. (신뢰도: {verification.confidence}%)</p>
              ) : (
                <div className="space-y-2">
                  <ul className="list-disc list-inside">
                    {verification.issues.map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                  {verification.suggestion && (
                    <p className="font-medium">제안: {verification.suggestion}</p>
                  )}
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Next Button */}
        {showResult && (
          <Button onClick={handleNext} className="w-full" size="lg">
            {currentIndex < questions.length - 1 ? "다음 문제" : "완료"}
          </Button>
        )}
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

export default TranslationQuiz;
