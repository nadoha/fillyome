import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { LoginPrompt } from "@/components/learn/LoginPrompt";
import { JapaneseText, KoreanMeaning } from "@/components/learn/JapaneseText";
import { ArrowLeft, Volume2, RotateCcw, CheckCircle, XCircle, RefreshCw, HelpCircle } from "lucide-react";
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
  notes: string | null;
}

const Flashcards = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { streak, refreshStreak } = useStreak();
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const sessionStartTime = useRef<Date>(new Date());

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      loadVocabulary();
    } else {
      setIsLoading(false);
    }
  };

  const loadVocabulary = async () => {
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

      if (!data || data.length === 0) {
        toast.error("단어장이 비어있습니다");
        navigate("/vocabulary");
        return;
      }

      const shuffled = [...data].sort(() => Math.random() - 0.5);
      setWords(shuffled);
    } catch (error) {
      console.error("Failed to load vocabulary:", error);
      toast.error("단어를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = (text: string, lang: string) => {
    speakText(text, lang, { rate: 0.9 });
  };

  const handleFlip = () => {
    if (!isFlipped) {
      handleSpeak(words[currentIndex].word, words[currentIndex].language);
    }
    setIsFlipped(!isFlipped);
  };

  const updateLearningSession = async (finalCorrect: number, finalIncorrect: number) => {
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
          total_answers: (existingSession.total_answers || 0) + finalCorrect + finalIncorrect,
          correct_answers: (existingSession.correct_answers || 0) + finalCorrect,
          words_studied: (existingSession.words_studied || 0) + words.length,
        }).eq("id", existingSession.id);
      } else {
        await supabase.from("learning_sessions").insert({
          user_id: user.id,
          session_date: today,
          study_duration_minutes: durationMinutes,
          total_answers: finalCorrect + finalIncorrect,
          correct_answers: finalCorrect,
          words_studied: words.length,
        });
      }
      refreshStreak();
    } catch (error) {
      console.error("Failed to update session:", error);
    }
  };

  const handleAnswer = async (wasCorrect: boolean, isDontKnow: boolean = false) => {
    const currentWord = words[currentIndex];
    setLastAnswerCorrect(wasCorrect);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("quiz_results").insert({
          user_id: user.id,
          vocabulary_id: currentWord.id,
          was_correct: wasCorrect,
          quiz_type: isDontKnow ? "flashcard_skip" : "flashcard",
        });
      }
    } catch (error) {
      console.error("Failed to record result:", error);
    }

    const newCorrect = sessionStats.correct + (wasCorrect ? 1 : 0);
    const newIncorrect = sessionStats.incorrect + (wasCorrect ? 0 : 1);

    setSessionStats({ correct: newCorrect, incorrect: newIncorrect });

    if (currentIndex < words.length - 1) {
      setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        setLastAnswerCorrect(null);
      }, isDontKnow ? 500 : 1000);
    } else {
      await updateLearningSession(newCorrect, newIncorrect);
      setTimeout(() => setShowRewardModal(true), 500);
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ correct: 0, incorrect: 0 });
    setLastAnswerCorrect(null);
    sessionStartTime.current = new Date();
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
  };

  // Extract Korean meanings from definition
  const getKoreanMeanings = (definition: any): string[] => {
    if (!definition) return ["의미 없음"];
    
    if (typeof definition === "string") {
      return [definition];
    }
    
    if (definition.meanings?.length > 0) {
      return definition.meanings.map((m: any) => m.definition || m);
    }
    
    if (definition.definitions?.length > 0) {
      return definition.definitions;
    }
    
    return ["의미 없음"];
  };

  // Extract part of speech
  const getPartOfSpeech = (definition: any): string | undefined => {
    if (!definition) return undefined;
    if (definition.pos) return definition.pos;
    if (definition.meanings?.[0]?.partOfSpeech) return definition.meanings[0].partOfSpeech;
    return undefined;
  };

  // Extract romaji
  const getRomaji = (definition: any): string | undefined => {
    if (!definition) return undefined;
    return definition.romanization || definition.romaji;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // Show login prompt if not logged in
  if (!user && words.length === 0) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="container max-w-lg mx-auto px-5 py-6">
            <header className="flex items-center gap-3 mb-8">
              <Button variant="ghost" size="icon" onClick={() => navigate("/learn")} className="shrink-0 -ml-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">플래시카드</h1>
            </header>
            <LoginPrompt 
              title="플래시카드 사용하기"
              description="플래시카드를 사용하려면 계정 연결이 필요해요"
            />
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">단어가 없습니다</p>
        <Button onClick={() => navigate("/learn")}>돌아가기</Button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;
  const isJapanese = currentWord.language === "ja";
  const koreanMeanings = getKoreanMeanings(currentWord.definition);
  const partOfSpeech = getPartOfSpeech(currentWord.definition);
  const romaji = getRomaji(currentWord.definition);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="container max-w-2xl mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/learn")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">플래시카드</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={handleReset}>
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{currentIndex + 1} / {words.length}</span>
              <span className="flex items-center gap-2">
                <span className="text-green-600">✓ {sessionStats.correct}</span>
                <span className="text-red-600">✗ {sessionStats.incorrect}</span>
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Flashcard */}
          <div className="relative" style={{ perspective: "1000px" }}>
            <Card
              className="min-h-[380px] cursor-pointer transition-all duration-500 transform-gpu shadow-lg"
              style={{
                transformStyle: "preserve-3d",
                transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
              }}
              onClick={handleFlip}
            >
              {/* Front Side - Japanese word with furigana and romaji */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg"
                style={{ backfaceVisibility: "hidden" }}
              >
                {isJapanese ? (
                  <JapaneseText
                    text={currentWord.word}
                    romaji={romaji}
                    size="xl"
                    showFurigana={true}
                    showRomaji={true}
                  />
                ) : (
                  <p className="text-4xl font-bold text-center">{currentWord.word}</p>
                )}
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="mt-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(currentWord.word, currentWord.language);
                  }}
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
                
                <p className="text-sm text-muted-foreground mt-4">
                  👆 카드를 눌러서 뜻 보기
                </p>
              </div>

              {/* Back Side - Korean meaning (must always show) */}
              <div
                className="absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden bg-gradient-to-br from-secondary/5 to-accent/5 rounded-lg"
                style={{
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <KoreanMeaning
                  meanings={koreanMeanings}
                  partOfSpeech={partOfSpeech}
                  notes={currentWord.notes || undefined}
                  size="lg"
                />
              </div>
            </Card>
          </div>

          {/* Emotional Feedback */}
          {lastAnswerCorrect !== null && <EmotionalFeedback isCorrect={lastAnswerCorrect} />}

          {/* Action Buttons - 3 options including "모르겠어요" */}
          {isFlipped && lastAnswerCorrect === null && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleAnswer(false)}
                  className="gap-2 border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <XCircle className="h-5 w-5" />
                  틀렸어요
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleAnswer(true)}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-5 w-5" />
                  알았어요
                </Button>
              </div>
              
              {/* "모르겠어요" option - less prominent, no penalty feeling */}
              <Button
                variant="ghost"
                size="lg"
                onClick={() => handleAnswer(false, true)}
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
              >
                <HelpCircle className="h-4 w-4" />
                모르겠어요 (다음에 다시)
              </Button>
            </div>
          )}
        </div>
      </div>

      <RewardModal
        isOpen={showRewardModal}
        onClose={() => {
          setShowRewardModal(false);
          navigate("/learn");
        }}
        score={sessionStats.correct}
        totalQuestions={sessionStats.correct + sessionStats.incorrect}
        streakMaintained={true}
        newStreak={streak + 1}
      />

      <BottomNavigation />
    </div>
  );
};

export default Flashcards;
