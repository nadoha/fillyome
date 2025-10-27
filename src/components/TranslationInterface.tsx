import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeftRight, Star, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Translation {
  id: string;
  source_text: string;
  target_text: string;
  source_lang: string;
  target_lang: string;
  is_favorite: boolean;
  created_at: string;
  content_classification: string;
  masked_source_text: string | null;
  masked_target_text: string | null;
  source_romanization: string | null;
  target_romanization: string | null;
  literal_translation: string | null;
}

export const TranslationInterface = () => {
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceLang, setSourceLang] = useState<"ko" | "ja">("ko");
  const [targetLang, setTargetLang] = useState<"ko" | "ja">("ja");
  const [isTranslating, setIsTranslating] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<Translation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLiteral, setShowLiteral] = useState<Record<string, boolean>>({});
  const [showConsentDialog, setShowConsentDialog] = useState(false);

  // Fetch recent translations from localStorage on mount
  useEffect(() => {
    fetchRecentTranslations();
    
    // 동의 여부 확인
    const consent = localStorage.getItem('dataCollectionConsent');
    if (consent === null) {
      setShowConsentDialog(true);
    }
  }, []);

  const handleConsent = useCallback((agreed: boolean) => {
    localStorage.setItem('dataCollectionConsent', agreed ? 'true' : 'false');
    setShowConsentDialog(false);
    
    if (agreed) {
      toast.success("동의 완료", {
        description: "서비스 개선을 위한 데이터 수집에 동의하셨습니다.",
      });
    } else {
      toast.info("동의 거부", {
        description: "피드백 기능이 제한됩니다. 번역은 정상적으로 이용 가능합니다.",
      });
    }
  }, []);

  const hasConsent = useCallback(() => {
    return localStorage.getItem('dataCollectionConsent') === 'true';
  }, []);

  const fetchRecentTranslations = useCallback(() => {
    const stored = localStorage.getItem('translations');
    if (stored) {
      const translations = JSON.parse(stored);
      setRecentTranslations(translations.slice(0, 3));
    }
  }, []);

  const saveToLocalStorage = useCallback((translation: Translation) => {
    const stored = localStorage.getItem('translations');
    const translations = stored ? JSON.parse(stored) : [];
    translations.unshift(translation);
    localStorage.setItem('translations', JSON.stringify(translations));
  }, []);

  const swapLanguages = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setTargetText("");
  }, [sourceLang, targetLang]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
      toast.error("텍스트를 입력해주세요");
      return;
    }

    setIsTranslating(true);

    try {
      const { data, error } = await supabase.functions.invoke("translate", {
        body: {
          text: sourceText,
          sourceLang,
          targetLang,
        },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      const translation = data.translation;
      const literalTranslation = data.literalTranslation || "";
      const sourceRomanization = data.sourceRomanization || "";
      const targetRomanization = data.targetRomanization || "";
      
      setTargetText(translation);

      const newTranslation: Translation = {
        id: crypto.randomUUID(),
        source_text: sourceText,
        target_text: translation,
        source_lang: sourceLang,
        target_lang: targetLang,
        is_favorite: false,
        source_romanization: sourceRomanization,
        target_romanization: targetRomanization,
        literal_translation: literalTranslation,
        created_at: new Date().toISOString(),
        content_classification: 'safe',
        masked_source_text: null,
        masked_target_text: null,
      };
      
      saveToLocalStorage(newTranslation);
      fetchRecentTranslations();
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("번역 실패. 다시 시도해주세요.");
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang, saveToLocalStorage, fetchRecentTranslations]);

  const toggleFavorite = useCallback((id: string, currentFavorite: boolean) => {
    const stored = localStorage.getItem('translations');
    if (stored) {
      const translations = JSON.parse(stored);
      const updated = translations.map((t: Translation) =>
        t.id === id ? { ...t, is_favorite: !currentFavorite } : t
      );
      localStorage.setItem('translations', JSON.stringify(updated));
      fetchRecentTranslations();
    }
  }, [fetchRecentTranslations]);

  const getLangLabel = useCallback((lang: string) => {
    return lang === "ko" ? "한국어" : "日本語";
  }, []);

  const handleDelete = useCallback((id: string) => {
    const stored = localStorage.getItem('translations');
    if (stored) {
      const translations = JSON.parse(stored);
      const filtered = translations.filter((t: Translation) => t.id !== id);
      localStorage.setItem('translations', JSON.stringify(filtered));
      fetchRecentTranslations();
    }
  }, [fetchRecentTranslations]);

  const handleBulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;

    const stored = localStorage.getItem('translations');
    if (stored) {
      const translations = JSON.parse(stored);
      const filtered = translations.filter((t: Translation) => !selectedIds.has(t.id));
      localStorage.setItem('translations', JSON.stringify(filtered));
      toast.success(`${selectedIds.size}개 삭제됨`);
      setSelectedIds(new Set());
      fetchRecentTranslations();
    }
  }, [selectedIds, fetchRecentTranslations]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const toggleLiteral = useCallback((id: string) => {
    setShowLiteral(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleFeedback = useCallback(async (translation: Translation, feedbackType: 'positive' | 'negative') => {
    if (!hasConsent()) {
      toast.error("피드백 제한", {
        description: "데이터 수집에 동의하셔야 피드백을 제출할 수 있습니다.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("translation_feedback")
        .insert({
          translation_id: translation.id,
          source_text: translation.source_text,
          natural_translation: translation.target_text,
          literal_translation: translation.literal_translation,
          feedback_type: feedbackType,
        });

      if (error) throw error;

      toast.success(feedbackType === 'positive' ? "피드백 감사합니다!" : "피드백이 전송되었습니다");
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error("피드백 제출 중 오류가 발생했습니다.");
    }
  }, [hasConsent]);

  return (
    <>
      <AlertDialog open={showConsentDialog} onOpenChange={setShowConsentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>데이터 수집 및 이용 동의</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                번역 서비스 개선 및 AI 학습을 위해 다음 데이터를 수집합니다:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>번역 요청 원문 및 번역 결과</li>
                <li>사용자 피드백 (좋아요/어색해요)</li>
                <li>서비스 이용 기록</li>
              </ul>
              <p className="text-sm">
                동의하지 않으셔도 번역 기능은 정상적으로 이용 가능하나, 피드백 제출이 제한됩니다.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleConsent(false)}>
              동의하지 않음
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => handleConsent(true)}>
              동의함
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-background flex flex-col">
      {/* Main Translation Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl space-y-5">
          {/* Language Selector */}
          <div className="flex items-center justify-center gap-3">
            <button className="px-5 py-2.5 rounded-xl bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted">
              {getLangLabel(sourceLang)}
            </button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={swapLanguages}
              className="rounded-full h-9 w-9 hover:rotate-180 transition-all duration-300"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            
            <button className="px-5 py-2.5 rounded-xl bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted">
              {getLangLabel(targetLang)}
            </button>
          </div>

          {/* Translation Boxes */}
          <div className="grid md:grid-cols-2 gap-3">
            <Textarea
              placeholder="텍스트 입력..."
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              className="min-h-[180px] resize-none text-[15px] leading-relaxed border-0 bg-card shadow-sm rounded-2xl p-4 focus-visible:ring-1"
              autoFocus
            />

            <Textarea
              placeholder="번역 결과..."
              value={targetText}
              readOnly
              className="min-h-[180px] resize-none text-[15px] leading-relaxed border-0 bg-muted/40 shadow-sm rounded-2xl p-4"
            />
          </div>

          {/* Translate Button */}
          <div className="flex justify-center pt-1">
            <Button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim()}
              size="lg"
              className="px-10 py-2.5 rounded-full shadow-sm font-medium"
            >
              {isTranslating ? "번역 중..." : "번역하기"}
            </Button>
          </div>
        </div>
      </main>

      {/* Recent Translations */}
      {recentTranslations.length > 0 && (
        <aside className="border-t bg-muted/20">
          <div className="max-w-3xl mx-auto px-4 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">최근 기록</h3>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-7 px-3 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  삭제 ({selectedIds.size})
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {recentTranslations.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-card hover:shadow-sm transition-all group"
                >
                  <Checkbox
                    checked={selectedIds.has(t.id)}
                    onCheckedChange={() => toggleSelect(t.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="space-y-1">
                      <p className="text-[15px] text-foreground leading-relaxed">{t.source_text}</p>
                      {t.source_romanization && (
                        <p className="text-xs text-muted-foreground/60 italic">{t.source_romanization}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[15px] text-muted-foreground leading-relaxed">{t.target_text}</p>
                      {t.target_romanization && (
                        <p className="text-xs text-muted-foreground/60 italic">{t.target_romanization}</p>
                      )}
                    </div>
                      
                    <div className="flex items-center gap-2 pt-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(t, 'positive')}
                        className="h-7 px-2.5 text-xs hover:bg-muted"
                      >
                        <ThumbsUp className="h-3 w-3 mr-1" />
                        좋아요
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(t, 'negative')}
                        className="h-7 px-2.5 text-xs hover:bg-muted"
                      >
                        <ThumbsDown className="h-3 w-3 mr-1" />
                        어색해요
                      </Button>
                      {t.literal_translation && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleLiteral(t.id)}
                          className="h-7 px-2.5 text-xs hover:bg-muted"
                        >
                          {showLiteral[t.id] ? "직역 숨기기" : "직역 보기"}
                        </Button>
                      )}
                    </div>

                    {showLiteral[t.id] && t.literal_translation && (
                      <div className="pl-3 border-l-2 border-muted mt-2">
                        <p className="text-xs text-muted-foreground italic leading-relaxed">
                          {t.literal_translation}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleFavorite(t.id, t.is_favorite)}
                    >
                      <Star
                        className={`h-4 w-4 transition-colors ${
                          t.is_favorite
                            ? "fill-accent text-accent"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
      </div>
    </>
  );
};
