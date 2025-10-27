import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeftRight, Trash2, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { franc } from "franc-min";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDictionary } from "@/hooks/useDictionary";
import { DictionarySheet } from "./DictionarySheet";
import { TranslationBox } from "./TranslationBox";
import { RecentTranslationItem } from "./RecentTranslationItem";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";

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
  const { t, i18n } = useTranslation();
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [sourceRomanization, setSourceRomanization] = useState("");
  const [targetRomanization, setTargetRomanization] = useState("");
  const [sourceLang, setSourceLang] = useState<"ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr">(() => {
    const saved = localStorage.getItem('lastSourceLang');
    return (saved as any) || "ko";
  });
  const [targetLang, setTargetLang] = useState<"ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr">(() => {
    const saved = localStorage.getItem('lastTargetLang');
    return (saved as any) || "en";
  });
  const [recentLangPairs, setRecentLangPairs] = useState<Array<{source: string, target: string}>>(() => {
    const saved = localStorage.getItem('recentLangPairs');
    return saved ? JSON.parse(saved) : [];
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<Translation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLiteral, setShowLiteral] = useState<Record<string, boolean>>({});
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  
  const { lookupWord, currentEntry, currentWord, isLoading: isDictionaryLoading, reset: resetDictionary } = useDictionary();

  // Languages that don't need romanization (use Latin alphabet)
  const noRomanizationLangs = useMemo(() => ['en', 'es', 'fr', 'de', 'pt', 'it', 'id', 'tr', 'vi'], []);

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
    
    // Remove duplicates with same source text and language pair
    const filtered = translations.filter((t: Translation) => 
      !(t.source_text === translation.source_text && 
        t.source_lang === translation.source_lang && 
        t.target_lang === translation.target_lang)
    );
    
    filtered.unshift(translation);
    localStorage.setItem('translations', JSON.stringify(filtered));
  }, []);

  // Save language pair to localStorage and update recent pairs
  const updateLanguagePair = useCallback((source: string, target: string) => {
    localStorage.setItem('lastSourceLang', source);
    localStorage.setItem('lastTargetLang', target);
    
    // Update recent language pairs (max 3)
    setRecentLangPairs(prev => {
      const newPair = { source, target };
      const filtered = prev.filter(p => !(p.source === source && p.target === target));
      const updated = [newPair, ...filtered].slice(0, 3);
      localStorage.setItem('recentLangPairs', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const swapLanguages = useCallback(() => {
    const newSource = targetLang;
    const newTarget = sourceLang;
    setSourceLang(newSource);
    setTargetLang(newTarget);
    setTargetText("");
    updateLanguagePair(newSource, newTarget);
  }, [sourceLang, targetLang, updateLanguagePair]);

  const handleTranslate = useCallback(async () => {
    if (!sourceText.trim()) {
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
      const srcRomanization = data.sourceRomanization || "";
      const tgtRomanization = data.targetRomanization || "";
      
      setTargetText(translation);
      setSourceRomanization(srcRomanization);
      setTargetRomanization(tgtRomanization);

      const newTranslation: Translation = {
        id: crypto.randomUUID(),
        source_text: sourceText,
        target_text: translation,
        source_lang: sourceLang,
        target_lang: targetLang,
        is_favorite: false,
        source_romanization: srcRomanization,
        target_romanization: tgtRomanization,
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
  }, [sourceText, sourceLang, targetLang, saveToLocalStorage, fetchRecentTranslations]);

  // Auto-detect language
  useEffect(() => {
    if (sourceText.trim().length < 3) return;

    const detectTimer = setTimeout(() => {
      const detected = franc(sourceText);
      let detectedLang: "ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr" | null = null;
      if (detected === "kor") detectedLang = "ko";
      else if (detected === "jpn") detectedLang = "ja";
      else if (detected === "eng") detectedLang = "en";
      else if (detected === "cmn") detectedLang = "zh";
      else if (detected === "spa") detectedLang = "es";
      else if (detected === "fra") detectedLang = "fr";
      else if (detected === "deu") detectedLang = "de";
      else if (detected === "por") detectedLang = "pt";
      else if (detected === "ita") detectedLang = "it";
      else if (detected === "rus") detectedLang = "ru";
      else if (detected === "arb") detectedLang = "ar";
      else if (detected === "tha") detectedLang = "th";
      else if (detected === "vie") detectedLang = "vi";
      else if (detected === "ind") detectedLang = "id";
      else if (detected === "hin") detectedLang = "hi";
      else if (detected === "tur") detectedLang = "tr";

      if (detectedLang && detectedLang !== sourceLang) {
        setSourceLang(detectedLang);
        if (detectedLang === "ko") setTargetLang("en");
        else if (detectedLang === "ja") setTargetLang("ko");
        else if (detectedLang === "en") setTargetLang("ko");
        else if (detectedLang === "zh") setTargetLang("en");
        else setTargetLang("en"); // Default target for other languages
      }
    }, 300);

    return () => clearTimeout(detectTimer);
  }, [sourceText, sourceLang]);

  // Auto-translate (disabled in favor of manual button)
  // useEffect(() => {
  //   if (!sourceText.trim() || sourceText.trim().length < 2) {
  //     setTargetText("");
  //     setSourceRomanization("");
  //     setTargetRomanization("");
  //     return;
  //   }

  //   const translateTimer = setTimeout(() => {
  //     handleTranslate();
  //   }, 600);

  //   return () => clearTimeout(translateTimer);
  // }, [sourceText, sourceLang, targetLang, handleTranslate]);

  // Fetch recent translations from localStorage on mount
  useEffect(() => {
    fetchRecentTranslations();
  }, [fetchRecentTranslations]);



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
      toast.success(`${selectedIds.size} deleted`);
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

  const toggleLiteral = useCallback((id: string, sourceLang: string, targetLang: string) => {
    setShowLiteral(prev => {
      const isShowing = !prev[id];
      
      // Track literal button clicks per language pair
      if (isShowing) {
        const key = `literal_clicks_${sourceLang}_${targetLang}`;
        const current = parseInt(localStorage.getItem(key) || '0');
        localStorage.setItem(key, String(current + 1));
        console.log(`[Literal Tracking] ${sourceLang}→${targetLang}: ${current + 1} clicks`);
      }
      
      return { ...prev, [id]: isShowing };
    });
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

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  }, [t]);

  const handleSpeak = useCallback((text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language based on lang parameter
      const langMap: Record<string, string> = {
        ko: 'ko-KR',
        ja: 'ja-JP',
        en: 'en-US',
        zh: 'zh-CN',
        es: 'es-ES',
        fr: 'fr-FR',
        de: 'de-DE',
        pt: 'pt-PT',
        it: 'it-IT',
        ru: 'ru-RU',
        ar: 'ar-SA',
        th: 'th-TH',
        vi: 'vi-VN',
        id: 'id-ID',
        hi: 'hi-IN',
        tr: 'tr-TR'
      };
      utterance.lang = langMap[lang] || 'en-US';
      
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech not supported");
    }
  }, []);

  const handleTextSelection = useCallback((e: React.MouseEvent, lang: string, context: string) => {
    // Dictionary only supports ko, ja, en, zh
    const supportedDictionaryLangs = ['ko', 'ja', 'en', 'zh'];
    if (!supportedDictionaryLangs.includes(lang)) {
      return; // Skip dictionary for unsupported languages
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    if (selectedText && selectedText.length > 0) {
      const cleanText = selectedText.replace(/[.,!?;:'"()[\]{}]/g, '');
      if (cleanText) {
        setIsDictionaryOpen(true);
        lookupWord(cleanText, lang, i18n.language, context);
      }
    }
  }, [lookupWord, i18n.language]);

  const closeDictionary = useCallback(() => {
    setIsDictionaryOpen(false);
    resetDictionary();
  }, [resetDictionary]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/30 bg-card/20 backdrop-blur-sm sticky top-0 z-10 animate-slide-up">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Translate</h1>
          <div className="flex items-center gap-2">
            <Select value={i18n.language} onValueChange={(lang) => i18n.changeLanguage(lang)}>
              <SelectTrigger className="w-[130px] h-9 border-0 bg-transparent gap-1.5 text-sm hover:bg-accent/50 transition-colors">
                <Globe className="h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ko">{t("korean")}</SelectItem>
                <SelectItem value="ja">{t("japanese")}</SelectItem>
                <SelectItem value="en">{t("english")}</SelectItem>
                <SelectItem value="zh">{t("chinese")}</SelectItem>
              </SelectContent>
            </Select>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-3 sm:px-6 py-8 sm:py-12 animate-fade-in">
        <div className="w-full max-w-5xl space-y-4 sm:space-y-6">
          {/* Language Selector */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 animate-scale-in">
            <LanguageSelector
              value={sourceLang}
              onChange={(newLang) => {
                setSourceLang(newLang as any);
                updateLanguagePair(newLang, targetLang);
              }}
              recentPairs={recentLangPairs}
              type="source"
            />
            
            <Button
              variant="outline"
              size="icon"
              onClick={swapLanguages}
              className="h-9 w-9 rounded-full hover:bg-accent hover:rotate-180 transition-all duration-300"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            
            <LanguageSelector
              value={targetLang}
              onChange={(newLang) => {
                setTargetLang(newLang as any);
                updateLanguagePair(sourceLang, newLang);
              }}
              recentPairs={recentLangPairs}
              type="target"
            />
          </div>

          {/* Translation Boxes */}
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3 sm:gap-4">
              <TranslationBox
                value={sourceText}
                onChange={setSourceText}
                onCopy={() => handleCopy(sourceText)}
                onSpeak={() => handleSpeak(sourceText, sourceLang)}
                placeholder={t("enterText")}
                isEditable
                romanization={!noRomanizationLangs.includes(sourceLang) ? sourceRomanization : undefined}
              />
              
              <TranslationBox
                value={targetText}
                onCopy={() => handleCopy(targetText)}
                onSpeak={() => handleSpeak(targetText, targetLang)}
                onTextSelect={(e) => targetText && handleTextSelection(e, targetLang, targetText)}
                placeholder={`${t("translate")}...`}
                isTranslating={isTranslating}
                romanization={!noRomanizationLangs.includes(targetLang) ? targetRomanization : undefined}
              />
            </div>
            
            {/* Translate Button */}
            <div className="flex justify-center">
              <Button
                onClick={handleTranslate}
                disabled={!sourceText.trim() || isTranslating}
                className="w-full md:w-auto px-8 py-5 text-base font-semibold"
                size="lg"
              >
                {isTranslating ? (
                  <>
                    <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    {t("translating")}
                  </>
                ) : (
                  t("translate")
                )}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Recent */}
      {recentTranslations.length > 0 && (
        <aside className="border-t border-border/30 bg-muted/10 backdrop-blur-sm animate-slide-up">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">{t("recent3")}</h3>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-7 px-3 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  {t("bulkDelete")} ({selectedIds.size})
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {recentTranslations.map((translation, index) => (
                <div 
                  key={translation.id}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className="animate-fade-in"
                >
                  <RecentTranslationItem
                    translation={translation}
                    isSelected={selectedIds.has(translation.id)}
                    showLiteral={showLiteral[translation.id] || false}
                    onToggleSelect={() => toggleSelect(translation.id)}
                    onToggleLiteral={() => toggleLiteral(translation.id, translation.source_lang, translation.target_lang)}
                    onDelete={() => handleDelete(translation.id)}
                    onCopy={handleCopy}
                    onSpeak={handleSpeak}
                    onTextSelect={handleTextSelection}
                    onFeedback={(type) => handleFeedback(translation, type)}
                    noRomanization={noRomanizationLangs.includes(translation.source_lang) && noRomanizationLangs.includes(translation.target_lang)}
                    t={t}
                  />
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Dictionary Sheet */}
      <DictionarySheet
        isOpen={isDictionaryOpen}
        onClose={closeDictionary}
        word={currentWord}
        entry={currentEntry}
        isLoading={isDictionaryLoading}
      />
    </div>
  );
};
