import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BookOpen, Brain, Trophy, TrendingUp, ArrowLeft, Zap } from "lucide-react";
import { toast } from "sonner";

interface DailyStats {
  wordsToReview: number;
  wordsStudied: number;
  dailyGoal: number;
  streak: number;
}

const Learn = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<DailyStats>({
    wordsToReview: 0,
    wordsStudied: 0,
    dailyGoal: 20,
    streak: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadDailyStats();
  }, []);

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

      // Get words due for review today
      const { data: reviewWords, error: reviewError } = await supabase
        .from("vocabulary")
        .select("*")
        .eq("user_id", user.id)
        .lte("next_review", new Date().toISOString())
        .order("next_review", { ascending: true });

      if (reviewError) throw reviewError;

      // Get today's session stats
      const today = new Date().toISOString().split("T")[0];
      const { data: todaySession, error: sessionError } = await supabase
        .from("learning_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("session_date", today)
        .single();

      if (sessionError && sessionError.code !== "PGRST116") throw sessionError;

      setStats({
        wordsToReview: reviewWords?.length || 0,
        wordsStudied: todaySession?.words_studied || 0,
        dailyGoal: 20,
        streak: 7, // TODO: Calculate actual streak
      });
    } catch (error) {
      console.error("Failed to load stats:", error);
      toast.error("통계를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const progress = (stats.wordsStudied / stats.dailyGoal) * 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">오늘의 학습</h1>
        </div>

        {/* Daily Progress */}
        <Card className="bg-gradient-to-br from-primary/10 to-secondary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              학습 진도
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>오늘 {stats.wordsStudied}개 학습</span>
              <span>목표: {stats.dailyGoal}개</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-accent" />
                <span>{stats.streak}일 연속</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/flashcards")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="h-5 w-5 text-primary" />
                플래시카드
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                암기 카드로 단어 학습하기
              </p>
              <Button className="w-full" variant="default">
                시작하기
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/review")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5 text-secondary" />
                복습하기
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {stats.wordsToReview}개의 단어가 복습 대기 중
              </p>
              <Button 
                className="w-full" 
                variant="secondary"
                disabled={stats.wordsToReview === 0}
              >
                복습 시작
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/quiz")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-accent" />
                퀴즈
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                학습한 단어 테스트하기
              </p>
              <Button className="w-full" variant="outline">
                퀴즈 시작
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate("/stats")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-primary" />
                학습 통계
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                학습 기록 및 진도 확인
              </p>
              <Button className="w-full" variant="outline">
                통계 보기
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Translation */}
        <Card>
          <CardHeader>
            <CardTitle>빠른 번역</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              모르는 표현을 바로 번역하고 단어장에 추가하세요
            </p>
            <Button 
              className="w-full" 
              onClick={() => navigate("/")}
            >
              번역기로 이동
            </Button>
          </CardContent>
        </Card>

        {/* Vocabulary Shortcut */}
        <Card>
          <CardHeader>
            <CardTitle>내 단어장</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="secondary"
              onClick={() => navigate("/vocabulary")}
            >
              단어장 열기
            </Button>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Learn;