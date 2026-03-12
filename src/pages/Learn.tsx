import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { 
  ArrowLeft, ChevronRight, RefreshCw, BookOpen, Target, Zap, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { DynamicLearningSection } from "@/components/learn/DynamicLearningSection";
import { LearningLockedScreen } from "@/components/learn/LearningLockedScreen";
import { GuestModeBanner } from "@/components/GuestModeBanner";
import { useStreak } from "@/hooks/useStreak";
import { useLearningUnlock } from "@/hooks/useLearningUnlock";
import { useTargetLanguage } from "@/hooks/useTargetLanguage";
import { cn } from "@/lib/utils";

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
        <div className="spinner" />
        <p className="text-sm text-muted-foreground">{t("loadingText")}</p>
      </div>
    );
  }

  // Show locked screen if learning is not unlocked
  if (!isUnlocked) {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
          <div className="container max-w-lg mx-auto px-5 py-6 animate-page-transition">
            <header className="flex items-center gap-3 mb-8">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/")} 
                className="shrink-0 -ml-2 min-h-touch min-w-touch haptic"
                aria-label={t("goBack")}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-semibold">{t("learn")}</h1>
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

  // Guest mode indicator
  const isGuestMode = !user;

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex-1 overflow-y-auto pb-24 custom-scrollbar">
        <div className="container max-w-lg mx-auto px-5 py-6 space-y-8 animate-page-transition">
          {/* Header - Clean and minimal */}
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/")} 
                className="shrink-0 -ml-2 min-h-touch min-w-touch haptic"
                aria-label={t("goBack")}
              >
                <ArrowLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-semibold">{t("learn")}</h1>
            </div>
            {/* Simple streak indicator */}
            {streak > 0 && !isGuestMode && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{streak}</span>
                <span>{t("consecutiveDays")}</span>
              </div>
            )}
          </header>

          {/* Guest Mode Banner */}
          {isGuestMode && (
            <GuestModeBanner message={t("loginForLearningRecord")} />
          )}

          {/* Current Level - Subtle, informational */}
          <div className="flex items-center justify-between py-3 border-b border-border animate-stagger-1">
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

          {/* Today's Progress - Clean card with gradient progress */}
          <section className="animate-stagger-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-muted-foreground">{t("todaysLearning")}</h2>
              {todayCompleted && (
                <span className="text-xs text-primary font-medium animate-bounce-soft">{t("goalAchieved")}</span>
              )}
            </div>
            <Card className="border-border shadow-none hover-lift">
              <CardContent className="p-5">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-3xl font-semibold">{stats.wordsStudied}</p>
                    <p className="text-sm text-muted-foreground">{t("questionsCompleted")}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("dailyGoal")} {stats.dailyGoal}</p>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="absolute inset-y-0 left-0 progress-gradient rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Primary Action - Most prominent, stable design */}
          <section className="animate-stagger-3">
            <p className="text-xs text-muted-foreground mb-3">{t("myTranslationBased")}</p>
            <Card 
              className="cursor-pointer border-border hover:bg-muted/30 active:bg-muted/50 transition-all duration-200 shadow-none hover-lift ripple"
              onClick={() => navigate("/micro-lesson")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate("/micro-lesson")}
              aria-label={t("customLearningStart")}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium mb-1">{t("customLearningStart")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("recentTranslationBased")}
                    </p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </section>

          {/* Dynamic Personalized Learning Section */}
          <DynamicLearningSection />

          {/* Secondary Options - Grid layout with icons */}
          <section className="animate-stagger-4">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">{t("moreExercise")}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Card
                className="cursor-pointer border-border/60 hover:bg-muted/30 active:bg-muted/50 transition-all duration-200 shadow-none hover-lift ripple"
                onClick={() => navigate("/quiz")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate("/quiz")}
                aria-label={t("reviewSavedWords")}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-info/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("reviewSavedWords")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("checkSavedExpressions")}</p>
                  </div>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer border-border/60 hover:bg-muted/30 active:bg-muted/50 transition-all duration-200 shadow-none hover-lift ripple"
                onClick={() => navigate("/flashcards")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate("/flashcards")}
                aria-label={t("flashcards")}
              >
                <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-success/10 flex items-center justify-center">
                    <Target className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("flashcards")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t("quickReviewFlashcards")}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {stats.wrongAnswerCount > 0 && (
              <Card
                className="cursor-pointer border-border/60 hover:bg-muted/30 active:bg-muted/50 transition-all duration-200 shadow-none hover-lift ripple mt-3"
                onClick={() => navigate("/wrong-answers")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate("/wrong-answers")}
                aria-label={t("retryWrongAnswers")}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                      <RotateCcw className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t("retryWrongAnswers")}</p>
                      <p className="text-xs text-muted-foreground">{stats.wrongAnswerCount}{t("waitingReview")}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            )}
          </section>

          {/* Tertiary Actions - Minimal presence */}
          <section className="pt-2 animate-stagger-5">
            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1 h-auto py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-touch haptic"
                onClick={() => navigate("/vocabulary")}
                aria-label={t("myWordbook")}
              >
                {t("myWordbook")}
              </Button>
              <Button 
                variant="ghost" 
                className="flex-1 h-auto py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 min-h-touch haptic"
                onClick={() => navigate("/stats")}
                aria-label={t("learningRecord")}
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
