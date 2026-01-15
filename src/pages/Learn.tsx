import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { 
  BookOpen, Brain, Trophy, ArrowLeft, Languages, 
  Target, Sparkles, Calendar, ChevronRight, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { StreakBadge } from "@/components/learn/StreakBadge";
import { LevelSelector } from "@/components/learn/LevelSelector";
import { DynamicLearningSection } from "@/components/learn/DynamicLearningSection";
import { LearningLockedScreen } from "@/components/learn/LearningLockedScreen";
import { useStreak } from "@/hooks/useStreak";
import { useLearningUnlock } from "@/hooks/useLearningUnlock";

interface DailyStats {
  wordsToReview: number;
  wordsStudied: number;
  dailyGoal: number;
  wrongAnswerCount: number;
  totalVocabulary: number;
  translationCount: number;
}

const Learn = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { streak, todayCompleted, refreshStreak } = useStreak();
  const {
    isUnlocked,
    isLoading: isUnlockLoading,
    translationCount: unlockTransCount,
    vocabularyCount: unlockVocabCount,
    requiredTranslations,
    requiredVocabulary,
    progress: unlockProgress,
    jlptLevel,
  } = useLearningUnlock();
  
  const [currentLevel, setCurrentLevel] = useState("N5");
  const [stats, setStats] = useState<DailyStats>({
    wordsToReview: 0,
    wordsStudied: 0,
    dailyGoal: 5,
    wrongAnswerCount: 0,
    totalVocabulary: 0,
    translationCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    checkAuth();
    loadDailyStats();
    setGreeting(getGreeting());

    const channel = supabase
      .channel('learning-sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_sessions' }, () => {
        loadDailyStats();
        refreshStreak();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "좋은 아침이에요! ☀️";
    if (hour < 18) return "좋은 오후예요! 🌤️";
    return "좋은 저녁이에요! 🌙";
  };

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t("auth.loginRequired"));
      navigate("/auth");
    }
  };

  const loadDailyStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: reviewWords } = await supabase
        .from("vocabulary")
        .select("*", { count: "exact" })
        .eq("user_id", user.id)
        .lte("next_review", new Date().toISOString());

      const { count: totalVocab } = await supabase
        .from("vocabulary")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: translationCount } = await supabase
        .from("translations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const today = new Date().toISOString().split("T")[0];
      const { data: todaySession } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .maybeSingle();

      const { count: wrongCount } = await supabase
        .from("quiz_results")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("was_correct", false);

      // 레벨 자동 설정 (활동량 기반)
      const vocab = totalVocab || 0;
      const trans = translationCount || 0;
      if (vocab >= 200 || trans >= 500) setCurrentLevel("N1");
      else if (vocab >= 100 || trans >= 300) setCurrentLevel("N2");
      else if (vocab >= 50 || trans >= 150) setCurrentLevel("N3");
      else if (vocab >= 20 || trans >= 50) setCurrentLevel("N4");
      else setCurrentLevel("N5");

      setStats({
        wordsToReview: reviewWords?.length || 0,
        wordsStudied: todaySession?.words_studied || 0,
        dailyGoal: 5,
        wrongAnswerCount: wrongCount || 0,
        totalVocabulary: totalVocab || 0,
        translationCount: translationCount || 0,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const progress = Math.min((stats.wordsStudied / stats.dailyGoal) * 100, 100);

  if (isLoading || isUnlockLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  // Show locked screen if learning is not unlocked
  if (!isUnlocked) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="container max-w-lg mx-auto p-4">
            <header className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">학습</h1>
            </header>
            <LearningLockedScreen
              translationCount={unlockTransCount}
              vocabularyCount={unlockVocabCount}
              requiredTranslations={requiredTranslations}
              requiredVocabulary={requiredVocabulary}
              progress={unlockProgress}
            />
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="container max-w-lg mx-auto p-4 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-sm text-muted-foreground">{greeting}</p>
              <h1 className="text-2xl font-bold">학습</h1>
            </div>
          </div>
          <StreakBadge streak={streak} />
        </header>

        {/* Level Selector */}
        <LevelSelector
          currentLevel={currentLevel}
          onLevelChange={setCurrentLevel}
          vocabCount={stats.totalVocabulary}
          translationCount={stats.translationCount}
        />

        {/* Today's Goal - Compact */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <span className="font-semibold">오늘의 목표</span>
              </div>
              {todayCompleted && (
                <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full">
                  <Sparkles className="h-4 w-4" />
                  달성!
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{stats.wordsStudied}개 학습 완료</span>
                <span>{stats.dailyGoal}개 목표</span>
              </div>
              <Progress value={progress} className="h-3 bg-white/20" />
            </div>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{streak}</p>
                <p className="text-xs text-muted-foreground">연속 학습</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-secondary">{stats.totalVocabulary}</p>
                <p className="text-xs text-muted-foreground">저장된 단어</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">{stats.wordsToReview}</p>
                <p className="text-xs text-muted-foreground">복습 대기</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Personalized Learning Section */}
        <DynamicLearningSection />

        {/* Micro Lesson CTA */}
        <Card 
          className="cursor-pointer bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20 hover:shadow-lg transition-all"
          onClick={() => navigate("/micro-lesson")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-bold">맞춤 학습 시작</p>
                <p className="text-xs text-muted-foreground">내 번역 기록으로 만든 3-5문제</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        {/* More Options - User-centric language */}
        <section>
          <h2 className="text-lg font-bold mb-4">더 다양한 연습</h2>
          <div className="space-y-2">
            <Card
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/quiz")}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Trophy className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">내가 저장한 표현</p>
                    <p className="text-xs text-muted-foreground">저장한 단어로 실력 확인</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/japanese")}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <span className="text-xl">🇯🇵</span>
                  </div>
                  <div>
                    <p className="font-medium">일본어 문자 연습</p>
                    <p className="text-xs text-muted-foreground">히라가나, 가타카나, 칸지</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => navigate("/stats")}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-secondary/10">
                    <Calendar className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium">나의 학습 기록</p>
                    <p className="text-xs text-muted-foreground">진도와 성장 확인</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate("/vocabulary")}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-sm">내 단어장</span>
          </Button>
          <Button 
            variant="outline" 
            className="h-auto py-4 flex-col gap-2"
            onClick={() => navigate("/")}
          >
            <Languages className="h-5 w-5" />
            <span className="text-sm">번역하러 가기</span>
          </Button>
        </section>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Learn;
