import { useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  // Fetch recent translations from localStorage on mount
  useEffect(() => {
    fetchRecentTranslations();
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
    // Silent feedback submission - no success toast, only log errors
    try {
      await supabase
        .from("translation_feedback")
        .insert({
          translation_id: translation.id,
          source_text: translation.source_text,
          natural_translation: translation.target_text,
          literal_translation: translation.literal_translation,
          feedback_type: feedbackType,
        });
    } catch (error) {
      console.error('Feedback submission failed silently:', error);
      // No user notification - fail silently as per requirement
    }
  }, []);

  return (
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
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">최근 3개</h3>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-7 px-3 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  선택 삭제 ({selectedIds.size})
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
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Source text with romanization */}
                    <div className="space-y-0.5">
                      <p className="text-[15px] text-foreground leading-relaxed">{t.source_text}</p>
                      {t.source_romanization && (
                        <p className="text-xs text-muted-foreground/60 italic">{t.source_romanization}</p>
                      )}
                    </div>

                    {/* Natural translation with romanization */}
                    <div className="space-y-0.5">
                      <p className="text-[15px] text-primary/90 leading-relaxed font-medium">{t.target_text}</p>
                      {t.target_romanization && (
                        <p className="text-xs text-muted-foreground/60 italic">{t.target_romanization}</p>
                      )}
                    </div>

                    {/* Literal translation toggle - clearly visible */}
                    {t.literal_translation && (
                      <div className="pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLiteral(t.id)}
                          className="h-8 px-3 text-xs font-medium border-primary/20 hover:bg-primary/5"
                        >
                          {showLiteral[t.id] ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1.5" />
                              직역 숨기기
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1.5" />
                              직역 보기
                            </>
                          )}
                        </Button>
                        
                        {showLiteral[t.id] && (
                          <div className="mt-2 pl-3 border-l-2 border-primary/20 bg-primary/5 -ml-3 py-2 pr-3">
                            <p className="text-xs text-foreground/80 leading-relaxed">
                              {t.literal_translation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                      
                    {/* Feedback buttons - simple and clear */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(t, 'positive')}
                        className="h-8 px-3 text-xs hover:bg-green-500/10"
                      >
                        👍 Good
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(t, 'negative')}
                        className="h-8 px-3 text-xs hover:bg-orange-500/10"
                      >
                        👎 Feels off
                      </Button>
                    </div>
                  </div>

                  {/* Delete button only */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}
    </div>
  );
};
