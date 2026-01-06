import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BottomNavigation } from "@/components/BottomNavigation";
import { ArrowLeft, XCircle, RefreshCw, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WrongAnswer {
  id: string;
  word: string;
  correct_answer: string;
  user_answer: string;
  quiz_type: string;
  created_at: string;
  vocabulary_id?: string;
}

interface QuizResultWithVocab {
  id: string;
  was_correct: boolean;
  quiz_type: string;
  created_at: string;
  vocabulary_id: string | null;
  vocabulary?: {
    word: string;
    definition: any;
  } | null;
}

const WrongAnswers = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [wrongAnswers, setWrongAnswers] = useState<WrongAnswer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionWrongAnswers, setSessionWrongAnswers] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
    loadWrongAnswers();
    loadSessionWrongAnswers();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(t("auth.loginRequired"));
      navigate("/auth");
    }
  };

  const loadSessionWrongAnswers = () => {
    const stored = sessionStorage.getItem("lastWrongAnswers");
    if (stored) {
      try {
        setSessionWrongAnswers(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse session wrong answers:", e);
      }
    }
  };

  const loadWrongAnswers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get wrong quiz results with vocabulary data
      const { data, error } = await supabase
        .from("quiz_results")
        .select(`
          id,
          was_correct,
          quiz_type,
          created_at,
          vocabulary_id,
          vocabulary:vocabulary_id (
            word,
            definition
          )
        `)
        .eq("user_id", user.id)
        .eq("was_correct", false)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const typedData = data as unknown as QuizResultWithVocab[];

      // Transform to WrongAnswer format
      const transformed: WrongAnswer[] = typedData
        .filter(item => item.vocabulary)
        .map(item => ({
          id: item.id,
          word: item.vocabulary?.word || "알 수 없음",
          correct_answer: getDefinitionText(item.vocabulary?.definition),
          user_answer: "", // We don't store this currently
          quiz_type: item.quiz_type,
          created_at: item.created_at,
          vocabulary_id: item.vocabulary_id || undefined,
        }));

      setWrongAnswers(transformed);
    } catch (error) {
      console.error("Failed to load wrong answers:", error);
      toast.error("오답노트를 불러오는데 실패했습니다");
    } finally {
      setIsLoading(false);
    }
  };

  const getDefinitionText = (definition: any): string => {
    if (!definition) return "정의 없음";
    if (typeof definition === 'string') return definition;
    if (typeof definition === 'object') {
      if (definition.meanings && definition.meanings.length > 0) {
        return definition.meanings[0].definition || "정의 없음";
      }
      if (definition.definitions && definition.definitions.length > 0) {
        return definition.definitions[0] || "정의 없음";
      }
    }
    return "정의 없음";
  };

  const clearSessionWrongAnswers = () => {
    sessionStorage.removeItem("lastWrongAnswers");
    setSessionWrongAnswers([]);
    toast.success("최근 오답이 삭제되었습니다");
  };

  const getQuizTypeLabel = (type: string): string => {
    switch (type) {
      case "multiple_choice": return "객관식";
      case "translation_quiz": return "번역 퀴즈";
      case "review": return "복습";
      case "flashcard": return "플래시카드";
      default: return type;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">오답노트 불러오는 중...</p>
      </div>
    );
  }

  const hasAnyWrongAnswers = wrongAnswers.length > 0 || sessionWrongAnswers.length > 0;

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
          <h1 className="text-2xl font-bold">오답노트</h1>
        </div>

        {/* Stats */}
        <Card className="bg-gradient-to-br from-destructive/10 to-secondary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{wrongAnswers.length + sessionWrongAnswers.length}</p>
                  <p className="text-sm text-muted-foreground">틀린 문제</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate("/translation-quiz")}
              >
                다시 풀기
              </Button>
            </div>
          </CardContent>
        </Card>

        {!hasAnyWrongAnswers ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">오답이 없습니다!</p>
              <p className="text-muted-foreground mb-4">
                퀴즈를 풀어보세요. 틀린 문제는 여기에 기록됩니다.
              </p>
              <Button onClick={() => navigate("/translation-quiz")}>
                퀴즈 시작하기
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-4 pr-4">
              {/* Session wrong answers (from last quiz) */}
              {sessionWrongAnswers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      최근 퀴즈 오답
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={clearSessionWrongAnswers}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {sessionWrongAnswers.map((item, idx) => (
                    <Card key={`session-${idx}`} className="border-destructive/30">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-bold truncate">{item.word}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              정답: <span className="text-foreground font-medium">{item.correctAnswer}</span>
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary/50 text-secondary-foreground">
                            번역 퀴즈
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Database wrong answers */}
              {wrongAnswers.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    전체 오답 기록
                  </h2>
                  {wrongAnswers.map((item) => (
                    <Card key={item.id} className="border-muted">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-bold truncate">{item.word}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              정답: <span className="text-foreground font-medium">{item.correct_answer}</span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                            {getQuizTypeLabel(item.quiz_type)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default WrongAnswers;
