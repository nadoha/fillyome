import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ArrowLeft, TrendingUp, Target, Calendar, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Stats {
  totalWords: number;
  wordsToReview: number;
  averageAccuracy: number;
  studyStreak: number;
  weeklyProgress: { date: string; count: number }[];
}

const Stats = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<Stats>({
    totalWords: 0,
    wordsToReview: 0,
    averageAccuracy: 0,
    studyStreak: 0,
    weeklyProgress: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadStats();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t("auth.loginRequired"));
      navigate("/auth");
    }
  };

  const loadStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total vocabulary count
      const { count: totalWords, error: vocabError } = await supabase
        .from("vocabulary")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (vocabError) throw vocabError;

      // Get words due for review
      const { count: wordsToReview, error: reviewError } = await supabase
        .from("vocabulary")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lte("next_review", new Date().toISOString());

      if (reviewError) throw reviewError;

      // Get quiz results for accuracy
      const { data: quizResults, error: quizError } = await supabase
        .from("quiz_results")
        .select("was_correct")
        .eq("user_id", user.id);

      if (quizError) throw quizError;

      const accuracy =
        quizResults && quizResults.length > 0
          ? (quizResults.filter((r) => r.was_correct).length / quizResults.length) * 100
          : 0;

      // Get weekly progress
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data: sessions, error: sessionError } = await supabase
        .from("learning_sessions")
        .select("session_date, words_studied")
        .eq("user_id", user.id)
        .gte("session_date", weekAgo.toISOString().split("T")[0])
        .order("session_date", { ascending: true });

      if (sessionError) throw sessionError;

      const weeklyProgress = sessions?.map((s) => ({
        date: s.session_date,
        count: s.words_studied || 0,
      })) || [];

      setStats({
        totalWords: totalWords || 0,
        wordsToReview: wordsToReview || 0,
        averageAccuracy: Math.round(accuracy),
        studyStreak: 7, // TODO: Calculate actual streak
        weeklyProgress,
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
      toast.error("통계를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">로딩 중...</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
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
          <h1 className="text-3xl font-bold">학습 통계</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{stats.totalWords}</p>
              <p className="text-sm text-muted-foreground">총 단어</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-secondary" />
              <p className="text-3xl font-bold">{stats.wordsToReview}</p>
              <p className="text-sm text-muted-foreground">복습 대기</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-accent" />
              <p className="text-3xl font-bold">{stats.averageAccuracy}%</p>
              <p className="text-sm text-muted-foreground">정답률</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">{stats.studyStreak}</p>
              <p className="text-sm text-muted-foreground">연속 학습</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>주간 학습 현황</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.weeklyProgress.length > 0 ? (
              <div className="space-y-4">
                {stats.weeklyProgress.map((day) => (
                  <div key={day.date} className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-24">
                      {new Date(day.date).toLocaleDateString("ko-KR", { 
                        month: "short", 
                        day: "numeric" 
                      })}
                    </span>
                    <div className="flex-1 bg-muted rounded-full h-8 relative">
                      <div
                        className="bg-primary h-full rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.min((day.count / 30) * 100, 100)}%` }}
                      >
                        {day.count > 0 && (
                          <span className="text-xs text-primary-foreground font-semibold">
                            {day.count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                아직 학습 기록이 없습니다
              </p>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>학습 성취</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl mb-2">🎯</p>
                <p className="text-sm font-semibold">첫 단어 추가</p>
                <p className="text-xs text-muted-foreground">달성</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl mb-2">📚</p>
                <p className="text-sm font-semibold">단어 10개 학습</p>
                <p className="text-xs text-muted-foreground">
                  {stats.totalWords >= 10 ? "달성" : `${stats.totalWords}/10`}
                </p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <p className="text-2xl mb-2">🔥</p>
                <p className="text-sm font-semibold">7일 연속 학습</p>
                <p className="text-xs text-muted-foreground">
                  {stats.studyStreak >= 7 ? "달성" : `${stats.studyStreak}/7`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Stats;