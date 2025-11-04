import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeftRight, Menu, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { franc } from "franc-min";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDictionary } from "@/hooks/useDictionary";
import { DictionarySheet } from "./DictionarySheet";
import { TranslationBox } from "./TranslationBox";
import { TranslationResultBox } from "./TranslationResultBox";
import { LanguageSelector } from "./LanguageSelector";
import { ThemeToggle } from "./ThemeToggle";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { User } from "@supabase/supabase-js";

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
  const [user, setUser] = useState<User | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [literalTranslation, setLiteralTranslation] = useState("");
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

  // Load translations from DB or localStorage
  const loadTranslations = useCallback(async () => {
    if (user) {
      // Load from database
      try {
        const { data, error } = await supabase
          .from("translations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setRecentTranslations(data || []);
      } catch (error) {
        console.error("Failed to load translations:", error);
      }
    } else {
      // Load from localStorage
      const stored = localStorage.getItem('translations');
      if (stored) {
        const translations = JSON.parse(stored);
        setRecentTranslations(translations.slice(0, 50));
      }
    }
  }, [user]);

  // Save translation to DB or localStorage
  const saveTranslation = useCallback(async (translation: Translation) => {
    if (user) {
      // Save to database
      try {
        const { error } = await supabase
          .from("translations")
          .insert({
            user_id: user.id,
            source_text: translation.source_text,
            target_text: translation.target_text,
            source_lang: translation.source_lang,
            target_lang: translation.target_lang,
            literal_translation: translation.literal_translation,
            source_romanization: translation.source_romanization,
            target_romanization: translation.target_romanization,
            is_favorite: translation.is_favorite,
            content_classification: translation.content_classification,
            masked_source_text: translation.masked_source_text,
            masked_target_text: translation.masked_target_text,
          });
        
        if (error) throw error;
        await loadTranslations();
      } catch (error) {
        console.error("Failed to save translation:", error);
        toast.error(t("saveFailed") || "번역 저장 실패");
      }
    } else {
      // Save to localStorage
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
      loadTranslations();
    }
  }, [user, loadTranslations, t]);

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

    // Check cache first
    const cacheKey = `tr_${sourceLang}_${targetLang}_${sourceText}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { translation, literal, srcRom, tgtRom } = JSON.parse(cached);
        setTargetText(translation);
        setLiteralTranslation(literal);
        setSourceRomanization(srcRom);
        setTargetRomanization(tgtRom);
        return;
      } catch (e) {
        // Invalid cache, continue with API call
      }
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
      const literal = data.literalTranslation || "";
      const srcRomanization = data.sourceRomanization || "";
      const tgtRomanization = data.targetRomanization || "";
      
      // Cache result (limit cache size)
      try {
        const cacheData = { translation, literal, srcRom: srcRomanization, tgtRom: tgtRomanization };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        
        // Clean old cache entries (keep max 100)
        const keys = Object.keys(localStorage).filter(k => k.startsWith('tr_'));
        if (keys.length > 100) {
          keys.slice(0, keys.length - 100).forEach(k => localStorage.removeItem(k));
        }
      } catch (e) {
        // Cache full or error, continue without caching
      }
      
      setTargetText(translation);
      setLiteralTranslation(literal);
      setSourceRomanization(srcRomanization);
      setTargetRomanization(tgtRomanization);

      // Do not save to history on auto-translate
    } catch (error) {
      console.error("Translation error:", error);
      toast.error("Translation failed. Please try again.");
    } finally {
      setIsTranslating(false);
    }
  }, [sourceText, sourceLang, targetLang]);

  // Auto-detect language with improved sensitivity
  useEffect(() => {
    if (sourceText.trim().length < 2) return;

    const detectTimer = setTimeout(() => {
      const detected = franc(sourceText, { minLength: 2 });
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
        let newTargetLang: typeof targetLang;
        if (detectedLang === "ko") newTargetLang = "en";
        else if (detectedLang === "ja") newTargetLang = "ko";
        else if (detectedLang === "en") newTargetLang = "ko";
        else if (detectedLang === "zh") newTargetLang = "en";
        else newTargetLang = "en";
        
        setSourceLang(detectedLang);
        setTargetLang(newTargetLang);
        updateLanguagePair(detectedLang, newTargetLang);
        toast.success(`${detectedLang.toUpperCase()} 자동 감지됨`, { duration: 1500 });
      }
    }, 200);

    return () => clearTimeout(detectTimer);
  }, [sourceText, sourceLang, updateLanguagePair]);

  // Auto-translate with debounce
  useEffect(() => {
    if (!sourceText.trim() || sourceText.trim().length < 2) {
      setTargetText("");
      setLiteralTranslation("");
      setSourceRomanization("");
      setTargetRomanization("");
      return;
    }

    const translateTimer = setTimeout(() => {
      handleTranslate();
    }, 400);

    return () => clearTimeout(translateTimer);
  }, [sourceText, sourceLang, targetLang, handleTranslate]);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load translations when user changes
  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  const handleDelete = useCallback(async (id: string) => {
    if (user) {
      // Delete from database
      try {
        const { error } = await supabase
          .from("translations")
          .delete()
          .eq("id", id)
          .eq("user_id", user.id);
        
        if (error) throw error;
        await loadTranslations();
      } catch (error) {
        console.error("Failed to delete translation:", error);
        toast.error(t("deleteFailed") || "삭제 실패");
      }
    } else {
      // Delete from localStorage
      const stored = localStorage.getItem('translations');
      if (stored) {
        const translations = JSON.parse(stored);
        const filtered = translations.filter((t: Translation) => t.id !== id);
        localStorage.setItem('translations', JSON.stringify(filtered));
        loadTranslations();
      }
    }
  }, [user, loadTranslations, t]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    if (user) {
      // Bulk delete from database
      try {
        const { error } = await supabase
          .from("translations")
          .delete()
          .in("id", Array.from(selectedIds))
          .eq("user_id", user.id);
        
        if (error) throw error;
        toast.success(`${selectedIds.size} deleted`);
        setSelectedIds(new Set());
        await loadTranslations();
      } catch (error) {
        console.error("Failed to bulk delete:", error);
        toast.error(t("deleteFailed") || "삭제 실패");
      }
    } else {
      // Bulk delete from localStorage
      const stored = localStorage.getItem('translations');
      if (stored) {
        const translations = JSON.parse(stored);
        const filtered = translations.filter((t: Translation) => !selectedIds.has(t.id));
        localStorage.setItem('translations', JSON.stringify(filtered));
        toast.success(`${selectedIds.size} deleted`);
        setSelectedIds(new Set());
        loadTranslations();
      }
    }
  }, [selectedIds, user, loadTranslations, t]);

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
    try {
      console.log('Submitting feedback:', {
        translation_id: translation.id,
        source_text: translation.source_text,
        natural_translation: translation.target_text,
        literal_translation: translation.literal_translation,
        feedback_type: feedbackType,
        user_id: user?.id || null,
      });

      const { data, error } = await supabase
        .from("translation_feedback")
        .insert({
          source_text: translation.source_text,
          natural_translation: translation.target_text,
          literal_translation: translation.literal_translation,
          feedback_type: feedbackType,
          user_id: user?.id || null,
        })
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Feedback submitted successfully:', data);
      toast.success(feedbackType === 'positive' ? t("feedbackThanks") : t("feedbackReceived"));
    } catch (error) {
      console.error('Feedback submission failed:', error);
      toast.error(t("feedbackError"));
    }
  }, [t, user]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  }, [t]);

  const handleSpeak = useCallback(async (text: string, lang: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, lang }
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Convert base64 to audio and play
        const audioData = atob(data.audioContent);
        const audioArray = new Uint8Array(audioData.length);
        for (let i = 0; i < audioData.length; i++) {
          audioArray[i] = audioData.charCodeAt(i);
        }
        const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.play();
      }
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast.error(t('translation.speakError'));
    }
  }, [t]);

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
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20">
        <AppSidebar
          recentTranslations={recentTranslations}
          selectedIds={selectedIds}
          showLiteral={showLiteral}
          onToggleSelect={toggleSelect}
          onToggleLiteral={toggleLiteral}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onCopy={handleCopy}
          onSpeak={handleSpeak}
          onTextSelect={handleTextSelection}
          onFeedback={handleFeedback}
          noRomanizationLangs={noRomanizationLangs}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <SidebarTrigger className="h-10 w-10 shrink-0" />
                  <h1 className="text-base sm:text-lg lg:text-xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent truncate">
                    번역기
                  </h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  <ThemeToggle />
                  <Select value={i18n.language} onValueChange={(lang) => i18n.changeLanguage(lang)}>
                    <SelectTrigger className="w-[100px] sm:w-[120px] h-9 sm:h-10 text-xs sm:text-sm">
                      <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 sm:mr-2 shrink-0" />
                      <SelectValue>
                        {i18n.language === 'ko' && t("korean")}
                        {i18n.language === 'ja' && t("japanese")}
                        {i18n.language === 'en' && t("english")}
                        {i18n.language === 'zh' && t("chinese")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      <SelectItem value="ko">{t("korean")}</SelectItem>
                      <SelectItem value="ja">{t("japanese")}</SelectItem>
                      <SelectItem value="en">{t("english")}</SelectItem>
                      <SelectItem value="zh">{t("chinese")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 lg:py-10 xl:py-12 animate-fade-in overflow-y-auto">
            <div className="w-full max-w-[1600px] space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 animate-scale-in">
                <LanguageSelector
                  value={sourceLang}
                  onChange={(newLang) => {
                    setSourceLang(newLang as any);
                    updateLanguagePair(newLang, targetLang);
                  }}
                  recentPairs={recentLangPairs}
                  type="source"
                  showAutoDetect={sourceText.trim().length >= 2}
                />
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={swapLanguages}
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-full hover:bg-accent hover:rotate-180 transition-all duration-300 shrink-0"
                >
                  <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5" />
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:gap-8 xl:gap-10">
                <TranslationBox
                  value={sourceText}
                  onChange={setSourceText}
                  onCopy={() => handleCopy(sourceText)}
                  onSpeak={() => handleSpeak(sourceText, sourceLang)}
                  onTextSelect={(e) => sourceText && handleTextSelection(e, sourceLang, sourceText)}
                  placeholder={t("enterText")}
                  isEditable
                  romanization={!noRomanizationLangs.includes(sourceLang) ? sourceRomanization : undefined}
                />
                
                <TranslationResultBox
                  naturalTranslation={targetText}
                  literalTranslation={literalTranslation}
                  romanization={!noRomanizationLangs.includes(targetLang) ? targetRomanization : undefined}
                  onCopy={() => handleCopy(targetText)}
                  onSpeak={() => handleSpeak(targetText, targetLang)}
                  onTextSelect={(e) => targetText && handleTextSelection(e, targetLang, targetText)}
                  onFeedback={(type) => {
                    if (targetText) {
                      handleFeedback({
                        id: crypto.randomUUID(),
                        source_text: sourceText,
                        target_text: targetText,
                        source_lang: sourceLang,
                        target_lang: targetLang,
                        is_favorite: false,
                        created_at: new Date().toISOString(),
                        content_classification: 'safe',
                        masked_source_text: null,
                        masked_target_text: null,
                        source_romanization: sourceRomanization,
                        target_romanization: targetRomanization,
                        literal_translation: literalTranslation
                      }, type);
                    }
                  }}
                  placeholder={`${t("translate")}...`}
                  isTranslating={isTranslating}
                />
              </div>
            </div>
          </main>

          <DictionarySheet
            isOpen={isDictionaryOpen}
            onClose={closeDictionary}
            word={currentWord}
            entry={currentEntry}
            isLoading={isDictionaryLoading}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};
