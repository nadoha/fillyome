import { useState, useEffect } from "react";
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

  const handleConsent = (agreed: boolean) => {
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
  };

  const hasConsent = () => {
    return localStorage.getItem('dataCollectionConsent') === 'true';
  };

  const fetchRecentTranslations = () => {
    const stored = localStorage.getItem('translations');
    if (stored) {
      const translations = JSON.parse(stored);
      setRecentTranslations(translations.slice(0, 3));
    }
  };

  const saveToLocalStorage = (translation: Translation) => {
    const stored = localStorage.getItem('translations');
    const translations = stored ? JSON.parse(stored) : [];
    translations.unshift(translation);
    localStorage.setItem('translations', JSON.stringify(translations));
  };

  const swapLanguages = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    // Keep sourceText as is - don't swap content
    setTargetText("");
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast.error("Please enter text to translate");
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

      // Default: Natural/idiomatic translation (의역)
      const translation = data.translation;
      const literalTranslation = data.literalTranslation || "";
      const sourceRomanization = data.sourceRomanization || "";
      const targetRomanization = data.targetRomanization || "";
      
      setTargetText(translation);

      // Save to localStorage instead of database
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
      toast.error("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleFavorite = (id: string, currentFavorite: boolean) => {
    const stored = localStorage.getItem('translations');
    if (stored) {
      const translations = JSON.parse(stored);
      const updated = translations.map((t: Translation) =>
        t.id === id ? { ...t, is_favorite: !currentFavorite } : t
      );
      localStorage.setItem('translations', JSON.stringify(updated));
      toast.success(currentFavorite ? "Removed from favorites" : "Added to favorites");
      fetchRecentTranslations();
    }
  };

  const getLangLabel = (lang: string) => {
    return lang === "ko" ? "한국어" : "日本語";
  };

  const handleDelete = (id: string) => {
    const stored = localStorage.getItem('translations');
    if (stored) {
      const translations = JSON.parse(stored);
      const filtered = translations.filter((t: Translation) => t.id !== id);
      localStorage.setItem('translations', JSON.stringify(filtered));
      toast.success("Deleted");
      fetchRecentTranslations();
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;

    const stored = localStorage.getItem('translations');
    if (stored) {
      const translations = JSON.parse(stored);
      const filtered = translations.filter((t: Translation) => !selectedIds.has(t.id));
      localStorage.setItem('translations', JSON.stringify(filtered));
      toast.success(`Deleted ${selectedIds.size} items`);
      setSelectedIds(new Set());
      fetchRecentTranslations();
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleLiteral = (id: string) => {
    setShowLiteral(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleFeedback = async (translation: Translation, feedbackType: 'positive' | 'negative') => {
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
  };

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
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl space-y-6">
          {/* Language Selector */}
          <div className="flex items-center justify-center gap-4">
            <div className="px-4 py-2 rounded-lg bg-card border border-border">
              <span className="text-lg font-medium text-foreground">
                {getLangLabel(sourceLang)}
              </span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={swapLanguages}
              className="rounded-full h-10 w-10 hover:rotate-180 transition-transform duration-300"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            
            <div className="px-4 py-2 rounded-lg bg-card border border-border">
              <span className="text-lg font-medium text-foreground">
                {getLangLabel(targetLang)}
              </span>
            </div>
          </div>

          {/* Translation Boxes */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Source Text */}
            <div className="space-y-2">
              <Textarea
                placeholder="Enter text to translate..."
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="min-h-[200px] resize-none text-base"
                autoFocus
              />
            </div>

            {/* Target Text */}
            <div className="space-y-2">
              <Textarea
                placeholder="Translation will appear here..."
                value={targetText}
                readOnly
                className="min-h-[200px] resize-none text-base bg-muted"
              />
            </div>
          </div>

          {/* Translate Button */}
          <div className="flex justify-center">
            <Button
              onClick={handleTranslate}
              disabled={isTranslating || !sourceText.trim()}
              size="lg"
              className="px-8"
            >
              {isTranslating ? "Translating..." : "Translate"}
            </Button>
          </div>
        </div>
      </main>

      {/* Recent Translations - Minimal Display */}
      {recentTranslations.length > 0 && (
        <aside className="border-t border-border bg-card">
          <div className="max-w-4xl mx-auto p-4 space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">Recent</h3>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-8"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete ({selectedIds.size})
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {recentTranslations.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-background hover:bg-muted/50 transition-colors group"
                >
                  <Checkbox
                    checked={selectedIds.has(t.id)}
                    onCheckedChange={() => toggleSelect(t.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span>{getLangLabel(t.source_lang)}</span>
                      <span>→</span>
                      <span>{getLangLabel(t.target_lang)}</span>
                    </div>
                    <p className="text-sm text-foreground truncate">{t.source_text}</p>
                    {t.source_romanization && (
                      <p className="text-xs text-muted-foreground/70 italic truncate">{t.source_romanization}</p>
                    )}
                    <div className="mt-1 space-y-2">
                      <p className="text-sm text-muted-foreground">{t.target_text}</p>
                      {t.target_romanization && (
                        <p className="text-xs text-muted-foreground/70 italic">{t.target_romanization}</p>
                      )}
                      
                      {/* Feedback buttons directly under translation */}
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback(t, 'positive')}
                          className="h-8 px-3 text-xs"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1.5" />
                          좋아요
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFeedback(t, 'negative')}
                          className="h-8 px-3 text-xs"
                        >
                          <ThumbsDown className="h-3 w-3 mr-1.5" />
                          어색해요
                        </Button>
                      </div>

                      {/* Literal translation toggle below feedback */}
                      {t.literal_translation && (
                        <div className="pt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleLiteral(t.id)}
                            className="h-6 px-2 text-xs"
                          >
                            {showLiteral[t.id] ? "Hide" : "Show"} Literal translation
                          </Button>
                          {showLiteral[t.id] && (
                            <div className="pl-3 border-l-2 border-border mt-1">
                              <p className="text-xs text-muted-foreground/90 italic">
                                Literal: {t.literal_translation}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => toggleFavorite(t.id, t.is_favorite)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          t.is_favorite
                            ? "fill-accent text-accent"
                            : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
