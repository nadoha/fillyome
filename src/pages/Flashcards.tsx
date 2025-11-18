import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ArrowLeft, Volume2, RotateCcw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

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
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });

  useEffect(() => {
    checkAuth();
    loadVocabulary();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t("auth.loginRequired"));
      navigate("/auth");
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
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.error("단어장이 비어있습니다");
        navigate("/vocabulary");
        return;
      }

      // Shuffle words for random order
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
    if (!("speechSynthesis" in window)) {
      toast.error("이 브라우저는 음성 재생을 지원하지 않습니다");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === "ko" ? "ko-KR" : lang === "ja" ? "ja-JP" : lang === "en" ? "en-US" : "zh-CN";
    speechSynthesis.speak(utterance);
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleAnswer = async (wasCorrect: boolean) => {
    const currentWord = words[currentIndex];
    
    // Record quiz result
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("quiz_results").insert({
          user_id: user.id,
          vocabulary_id: currentWord.id,
          was_correct: wasCorrect,
          quiz_type: "flashcard",
        });
      }
    } catch (error) {
      console.error("Failed to record result:", error);
    }

    setSessionStats(prev => ({
      correct: prev.correct + (wasCorrect ? 1 : 0),
      incorrect: prev.incorrect + (wasCorrect ? 0 : 1),
    }));

    // Move to next card
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      toast.success(`학습 완료! 정답: ${sessionStats.correct + (wasCorrect ? 1 : 0)}개`);
      navigate("/learn");
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ correct: 0, incorrect: 0 });
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  }

  if (words.length === 0) {
    return <div className="flex items-center justify-center min-h-screen">단어가 없습니다</div>;
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-2xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/learn")}
              aria-label="뒤로 가기"
            >
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
            <span>정답: {sessionStats.correct} | 오답: {sessionStats.incorrect}</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Flashcard */}
        <div className="relative" style={{ perspective: "1000px" }}>
          <Card
            className="min-h-[400px] cursor-pointer transition-all duration-500 transform-gpu"
            style={{
              transformStyle: "preserve-3d",
              transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
            onClick={handleFlip}
          >
            {/* Front Side */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden"
              style={{ backfaceVisibility: "hidden" }}
            >
              <p className="text-4xl font-bold mb-4 text-center">{currentWord.word}</p>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSpeak(currentWord.word, currentWord.language);
                }}
              >
                <Volume2 className="h-5 w-5" />
              </Button>
              <p className="text-sm text-muted-foreground mt-8">
                카드를 눌러서 뜻 보기
              </p>
            </div>

            {/* Back Side */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center p-8 backface-hidden"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="space-y-4 text-center">
                {currentWord.definition && typeof currentWord.definition === 'object' && (
                  <>
                    {currentWord.definition.meanings?.map((meaning: any, idx: number) => (
                      <div key={idx} className="space-y-2">
                        <p className="text-sm font-semibold text-primary">
                          [{meaning.partOfSpeech}]
                        </p>
                        <p className="text-lg">{meaning.definition}</p>
                      </div>
                    ))}
                  </>
                )}
                {currentWord.notes && (
                  <p className="text-sm text-muted-foreground italic mt-4">
                    {currentWord.notes}
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Action Buttons */}
        {isFlipped && (
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleAnswer(false)}
              className="gap-2"
            >
              <XCircle className="h-5 w-5" />
              몰랐어요
            </Button>
            <Button
              size="lg"
              onClick={() => handleAnswer(true)}
              className="gap-2"
            >
              <CheckCircle className="h-5 w-5" />
              알았어요
            </Button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Flashcards;