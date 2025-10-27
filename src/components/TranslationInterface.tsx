import { useState, useEffect, useCallback } from "react";
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
  const [sourceLang, setSourceLang] = useState<"ko" | "ja" | "en" | "zh">("ko");
  const [targetLang, setTargetLang] = useState<"ko" | "ja" | "en" | "zh">("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<Translation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLiteral, setShowLiteral] = useState<Record<string, boolean>>({});
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  
  const { lookupWord, currentEntry, currentWord, isLoading: isDictionaryLoading, reset: resetDictionary } = useDictionary();

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
      let detectedLang: "ko" | "ja" | "en" | "zh" | null = null;
      if (detected === "kor") detectedLang = "ko";
      else if (detected === "jpn") detectedLang = "ja";
      else if (detected === "eng") detectedLang = "en";
      else if (detected === "cmn") detectedLang = "zh";

      if (detectedLang && detectedLang !== sourceLang) {
        setSourceLang(detectedLang);
        if (detectedLang === "ko") setTargetLang("en");
        else if (detectedLang === "ja") setTargetLang("ko");
        else if (detectedLang === "en") setTargetLang("ko");
        else if (detectedLang === "zh") setTargetLang("en");
      }
    }, 300);

    return () => clearTimeout(detectTimer);
  }, [sourceText, sourceLang]);

  // Auto-translate
  useEffect(() => {
    if (!sourceText.trim() || sourceText.trim().length < 2) {
      setTargetText("");
      return;
    }

    const translateTimer = setTimeout(() => {
      handleTranslate();
    }, 600);

    return () => clearTimeout(translateTimer);
  }, [sourceText, sourceLang, targetLang, handleTranslate]);

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

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t("copied"));
  }, [t]);

  const handleSpeak = useCallback((text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language based on lang parameter
      if (lang === 'ko') utterance.lang = 'ko-KR';
      else if (lang === 'ja') utterance.lang = 'ja-JP';
      else if (lang === 'en') utterance.lang = 'en-US';
      else if (lang === 'zh') utterance.lang = 'zh-CN';
      
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech not supported");
    }
  }, []);

  const handleTextSelection = useCallback((e: React.MouseEvent, lang: string, context: string) => {
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
      <header className="border-b border-border/30 bg-card/20 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 py-2 flex items-center justify-between">
          <h1 className="text-base font-medium text-foreground">Translate</h1>
          <Select value={i18n.language} onValueChange={(lang) => i18n.changeLanguage(lang)}>
            <SelectTrigger className="w-[130px] h-9 border-0 bg-transparent gap-1.5 text-sm">
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
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-3 py-6">
        <div className="w-full max-w-3xl space-y-3">
          {/* Language Selector */}
          <div className="flex items-center justify-center gap-2">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as "ko" | "ja" | "en" | "zh")}
              className="px-4 py-2 rounded-lg bg-card/50 text-sm font-medium text-foreground border-0 cursor-pointer"
            >
              <option value="ko">{t("korean")}</option>
              <option value="ja">{t("japanese")}</option>
              <option value="en">{t("english")}</option>
              <option value="zh">{t("chinese")}</option>
            </select>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={swapLanguages}
              className="h-7 w-7"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
            </Button>
            
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as "ko" | "ja" | "en" | "zh")}
              className="px-4 py-2 rounded-lg bg-card/50 text-sm font-medium text-foreground border-0 cursor-pointer"
            >
              <option value="ko">{t("korean")}</option>
              <option value="ja">{t("japanese")}</option>
              <option value="en">{t("english")}</option>
              <option value="zh">{t("chinese")}</option>
            </select>
          </div>

          {/* Translation Boxes */}
          <div className="grid md:grid-cols-2 gap-2">
            <TranslationBox
              value={sourceText}
              onChange={setSourceText}
              onCopy={() => handleCopy(sourceText)}
              onSpeak={() => handleSpeak(sourceText, sourceLang)}
              placeholder={t("enterText")}
              isEditable
            />
            
            <TranslationBox
              value={targetText}
              onCopy={() => handleCopy(targetText)}
              onSpeak={() => handleSpeak(targetText, targetLang)}
              onTextSelect={(e) => targetText && handleTextSelection(e, targetLang, targetText)}
              placeholder={`${t("translate")}...`}
              isTranslating={isTranslating}
            />
          </div>
        </div>
      </main>

      {/* Recent */}
      {recentTranslations.length > 0 && (
        <aside className="border-t border-border/30 bg-muted/10">
          <div className="max-w-3xl mx-auto px-3 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground">{t("recent3")}</h3>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-6 px-2 text-xs text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {t("bulkDelete")} ({selectedIds.size})
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              {recentTranslations.map((translation) => (
                <RecentTranslationItem
                  key={translation.id}
                  translation={translation}
                  isSelected={selectedIds.has(translation.id)}
                  showLiteral={showLiteral[translation.id] || false}
                  onToggleSelect={() => toggleSelect(translation.id)}
                  onToggleLiteral={() => toggleLiteral(translation.id)}
                  onDelete={() => handleDelete(translation.id)}
                  onCopy={handleCopy}
                  onSpeak={handleSpeak}
                  onTextSelect={handleTextSelection}
                  onFeedback={(type) => handleFeedback(translation, type)}
                  t={t}
                />
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
