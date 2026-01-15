import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { 
  ArrowLeft, ChevronRight, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { DynamicLearningSection } from "@/components/learn/DynamicLearningSection";
import { LearningLockedScreen } from "@/components/learn/LearningLockedScreen";
import { useStreak } from "@/hooks/useStreak";
import { useLearningUnlock } from "@/hooks/useLearningUnlock";
import { useTargetLanguage } from "@/hooks/useTargetLanguage";

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
  const { targetLanguageName } = useTargetLanguage();
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
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoad();

    const channel = supabase
      .channel('learning-sessions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_sessions' }, () => {
        loadDailyStats();
        refreshStreak();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      loadDailyStats();
    } else {
      // Load from local storage for non-logged-in users
      loadLocalStats();
    }
  };

  const loadLocalStats = () => {
    try {
      const localVocab = JSON.parse(localStorage.getItem('local_vocabulary') || '[]');
      const localTranslations = JSON.parse(localStorage.getItem('translations') || '[]');
      
      setStats({
        wordsToReview: 0,
        wordsStudied: 0,
        dailyGoal: 5,
        wrongAnswerCount: 0,
        totalVocabulary: localVocab.length,
        translationCount: localTranslations.length,
      });
      setCurrentLevel("N5");
    } catch (error) {
      console.error("Failed to load local stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDailyStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        loadLocalStats();
        return;
      }

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
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  // Show locked screen if learning is not unlocked
  if (!isUnlocked) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="container max-w-lg mx-auto px-5 py-6">
            <header className="flex items-center gap-3 mb-8">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 -ml-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">학습</h1>
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

  // Show login prompt for learning features if not logged in
  if (!user) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 overflow-y-auto pb-24">
          <div className="container max-w-lg mx-auto px-5 py-6">
            <header className="flex items-center gap-3 mb-8">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 -ml-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">학습</h1>
            </header>
            
            <div className="space-y-8">
              <div className="text-center py-4">
                <h2 className="text-lg font-semibold mb-2">학습 기능 사용하기</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  학습 기능을 사용하려면<br />
                  계정 연결이 필요해요
                </p>
              </div>

              <Card className="border-border shadow-none">
                <CardContent className="p-5 text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    계정을 연결하면 번역 기록을 바탕으로<br />
                    맞춤 학습 문제를 제공해 드려요
                  </p>
                  <Button 
                    className="w-full"
                    onClick={() => navigate("/auth")}
                  >
                    Google 계정 연결하기
                  </Button>
                  <Button 
                    variant="ghost"
                    className="text-sm text-muted-foreground"
                    onClick={() => navigate("/")}
                  >
                    나중에 하기
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="container max-w-lg mx-auto px-5 py-6 space-y-8">
          {/* Header - Clean and minimal */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0 -ml-2">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">{t("learn")}</h1>
            </div>
            {/* Simple streak indicator */}
            {streak > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{streak}</span>
                <span>{t("consecutiveDays")}</span>
              </div>
            )}
          </header>

          {/* Current Level - Subtle, informational */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">{t("currentLevel")}</p>
              <p className="text-sm font-medium">{currentLevel} · {
                currentLevel === "N5" ? t("beginner") :
                currentLevel === "N4" ? t("elementary") :
                currentLevel === "N3" ? t("intermediate") :
                currentLevel === "N2" ? t("advanced") : t("expert")
              }</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-0.5">{t("savedExpressions")}</p>
              <p className="text-sm font-medium">{stats.totalVocabulary}</p>
            </div>
          </div>

          {/* Today's Progress - Clean card */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">{t("todaysLearning")}</h2>
              {todayCompleted && (
                <span className="text-xs text-primary font-medium">{t("goalAchieved")}</span>
              )}
            </div>
            <Card className="border-border shadow-none">
              <CardContent className="p-5">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-3xl font-semibold">{stats.wordsStudied}</p>
                    <p className="text-sm text-muted-foreground">{t("questionsCompleted")}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("dailyGoal")} {stats.dailyGoal}</p>
                </div>
                <Progress value={progress} className="h-1.5" />
              </CardContent>
            </Card>
          </section>

          {/* Primary Action - Most prominent, stable design */}
          <section>
            <p className="text-xs text-muted-foreground mb-3">{t("myTranslationBased")}</p>
            <Card 
              className="cursor-pointer border-border hover:bg-muted/30 active:bg-muted/50 transition-colors shadow-none"
              onClick={() => navigate("/micro-lesson")}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="font-medium mb-1">{t("customLearningStart")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("recentTranslationBased")}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </section>

          {/* Dynamic Personalized Learning Section */}
          <DynamicLearningSection />

          {/* Secondary Options - Lower visual hierarchy */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("moreExercise")}</h2>
            <div className="space-y-2">
              <Card
                className="cursor-pointer border-border/60 hover:bg-muted/30 active:bg-muted/50 transition-colors shadow-none"
                onClick={() => navigate("/quiz")}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("reviewSavedWords")}</p>
                    <p className="text-xs text-muted-foreground">{t("checkSavedExpressions")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-border/60 hover:bg-muted/30 active:bg-muted/50 transition-colors shadow-none"
                onClick={() => navigate("/flashcards")}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t("flashcards")}</p>
                    <p className="text-xs text-muted-foreground">{t("quickReviewFlashcards")}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>

              {stats.wrongAnswerCount > 0 && (
                <Card
                  className="cursor-pointer border-border/60 hover:bg-muted/30 active:bg-muted/50 transition-colors shadow-none"
                  onClick={() => navigate("/wrong-answers")}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{t("retryWrongAnswers")}</p>
                      <p className="text-xs text-muted-foreground">{stats.wrongAnswerCount}{t("waitingReview")}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              )}
            </div>
          </section>

          {/* Tertiary Actions - Minimal presence */}
          <section className="pt-2">
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1 h-auto py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => navigate("/vocabulary")}
              >
                {t("myWordbook")}
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1 h-auto py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50"
                onClick={() => navigate("/stats")}
              >
                {t("learningRecord")}
              </Button>
            </div>
          </section>

          {/* Subtle notice */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            {t("someNotAvailable")}
          </p>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Learn;
