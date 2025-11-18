import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ArrowLeft, Volume2 } from "lucide-react";
import { toast } from "sonner";

interface VocabularyItem {
  id: string;
  word: string;
  language: string;
  definition: any;
  next_review: string;
  review_count: number;
  ease_factor: number;
  interval_days: number;
}

const Review = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [words, setWords] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const sessionStartTime = useRef<Date>(new Date());
  const reviewedCount = useRef<number>(0);

  useEffect(() => {
    checkAuth();
    loadReviewWords();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t("auth.loginRequired"));
      navigate("/auth");
    }
  };

  const loadReviewWords = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .eq("user_id", user.id)
        .lte("next_review", new Date().toISOString())
        .order("next_review", { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        toast.success("복습할 단어가 없습니다!");
        navigate("/learn");
        return;
      }

      setWords(data);
    } catch (error) {
      console.error("Failed to load review words:", error);
      toast.error("복습 단어를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNextReview = (quality: number, item: VocabularyItem) => {
    // SM-2 algorithm for spaced repetition
    let { ease_factor, interval_days, review_count } = item;

    if (quality < 3) {
      // Failed: reset interval
      interval_days = 1;
    } else {
      // Passed
      if (review_count === 0) {
        interval_days = 1;
      } else if (review_count === 1) {
        interval_days = 6;
      } else {
        interval_days = Math.round(interval_days * ease_factor);
      }
    }

    // Update ease factor
    ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    ease_factor = Math.max(1.3, ease_factor);

    const next_review = new Date();
    next_review.setDate(next_review.getDate() + interval_days);

    return {
      ease_factor,
      interval_days,
      review_count: review_count + 1,
      next_review: next_review.toISOString(),
      last_reviewed: new Date().toISOString(),
    };
  };

  const updateLearningSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const sessionEndTime = new Date();
      const durationMinutes = Math.round(
        (sessionEndTime.getTime() - sessionStartTime.current.getTime()) / 60000
      );
      const today = new Date().toISOString().split("T")[0];

      // Check if session exists for today
      const { data: existingSession } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle();

      if (existingSession) {
        // Update existing session
        await supabase
          .from("learning_sessions")
          .update({
            study_duration_minutes: (existingSession.study_duration_minutes || 0) + durationMinutes,
            words_reviewed: (existingSession.words_reviewed || 0) + reviewedCount.current,
          })
          .eq("id", existingSession.id);
      } else {
        // Create new session
        await supabase.from("learning_sessions").insert({
          user_id: user.id,
          session_date: today,
          study_duration_minutes: durationMinutes,
          words_reviewed: reviewedCount.current,
        });
      }
    } catch (error) {
      console.error("Failed to update learning session:", error);
    }
  };

  const handleAnswer = async (quality: number) => {
    const currentWord = words[currentIndex];
    const updates = calculateNextReview(quality, currentWord);

    try {
      const { error } = await supabase
        .from("vocabulary")
        .update(updates)
        .eq("id", currentWord.id);

      if (error) throw error;

      // Record quiz result
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("quiz_results").insert({
          user_id: user.id,
          vocabulary_id: currentWord.id,
          was_correct: quality >= 3,
          quiz_type: "review",
        });
      }

      reviewedCount.current += 1;

      // Move to next word
      if (currentIndex < words.length - 1) {
        setCurrentIndex(currentIndex + 1);
        setShowAnswer(false);
      } else {
        await updateLearningSession();
        toast.success("복습 완료!");
        navigate("/learn");
      }
    } catch (error) {
      console.error("Failed to update review:", error);
      toast.error("복습 기록에 실패했습니다");
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

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  }

  if (words.length === 0) {
    return <div className="flex items-center justify-center min-h-screen">복습할 단어가 없습니다</div>;
  }

  const currentWord = words[currentIndex];
  const progress = ((currentIndex + 1) / words.length) * 100;

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
          <h1 className="text-2xl font-bold">복습하기</h1>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{currentIndex + 1} / {words.length}</span>
            <span>복습 {currentWord.review_count}회차</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Question Card */}
        <Card>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-4xl font-bold">{currentWord.word}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleSpeak(currentWord.word, currentWord.language)}
                >
                  <Volume2 className="h-5 w-5" />
                </Button>
              </div>

              {!showAnswer ? (
                <Button
                  onClick={() => setShowAnswer(true)}
                  className="w-full"
                  size="lg"
                >
                  답 보기
                </Button>
              ) : (
                <div className="space-y-4">
                  {currentWord.definition && typeof currentWord.definition === 'object' && (
                    <>
                      {currentWord.definition.meanings?.map((meaning: any, idx: number) => (
                        <div key={idx} className="space-y-2 p-4 bg-muted rounded-lg">
                          <p className="text-sm font-semibold text-primary">
                            [{meaning.partOfSpeech}]
                          </p>
                          <p className="text-lg">{meaning.definition}</p>
                          {meaning.examples && meaning.examples.length > 0 && (
                            <p className="text-sm text-muted-foreground italic">
                              예: {meaning.examples[0]}
                            </p>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quality Buttons */}
        {showAnswer && (
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              onClick={() => handleAnswer(1)}
              className="h-20 flex flex-col gap-1"
            >
              <span className="text-lg">😰</span>
              <span className="text-xs">몰랐어요</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAnswer(3)}
              className="h-20 flex flex-col gap-1"
            >
              <span className="text-lg">🤔</span>
              <span className="text-xs">어려웠어요</span>
            </Button>
            <Button
              variant="default"
              onClick={() => handleAnswer(5)}
              className="h-20 flex flex-col gap-1"
            >
              <span className="text-lg">😊</span>
              <span className="text-xs">쉬웠어요</span>
            </Button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Review;