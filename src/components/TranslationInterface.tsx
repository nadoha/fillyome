import { useState, useEffect, useCallback } from "react";
import { ArrowLeftRight, Trash2, ChevronDown, ChevronUp, Globe, Copy, Volume2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { franc } from "franc-min";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDictionary } from "@/hooks/useDictionary";
import { DictionarySheet } from "./DictionarySheet";

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
  const [sourceLang, setSourceLang] = useState<"ko" | "ja" | "en">("ko");
  const [targetLang, setTargetLang] = useState<"ko" | "ja" | "en">("en");
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

  // Auto-detect language and set source/target languages
  useEffect(() => {
    if (sourceText.trim().length < 3) return;

    const detectTimer = setTimeout(() => {
      const detected = franc(sourceText);
      
      // Map franc language codes to our codes
      let detectedLang: "ko" | "ja" | "en" | null = null;
      if (detected === "kor") detectedLang = "ko";
      else if (detected === "jpn") detectedLang = "ja";
      else if (detected === "eng") detectedLang = "en";

      if (detectedLang && detectedLang !== sourceLang) {
        setSourceLang(detectedLang);
        
        // Auto-set target language based on detected source
        if (detectedLang === "ko") setTargetLang("en");
        else if (detectedLang === "ja") setTargetLang("ko");
        else if (detectedLang === "en") setTargetLang("ko");
      }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(detectTimer);
  }, [sourceText, sourceLang]);

  // Auto-translate when text or languages change
  useEffect(() => {
    if (!sourceText.trim() || sourceText.trim().length < 2) {
      setTargetText("");
      return;
    }

    const translateTimer = setTimeout(() => {
      handleTranslate();
    }, 1000); // Wait 1 second after user stops typing

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
      
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } else {
      toast.error("Text-to-speech not supported");
    }
  }, []);

  const renderClickableText = useCallback((text: string, lang: string, context: string) => {
    // Split text into words, preserving spaces and punctuation
    const words = text.split(/(\s+)/);
    
    return (
      <>
        {words.map((word, index) => {
          // If it's whitespace, render as-is
          if (/^\s+$/.test(word)) {
            return <span key={index}>{word}</span>;
          }
          
          // If it's a word, make it clickable
          return (
            <span
              key={index}
              className="cursor-pointer hover:bg-muted/70 active:bg-muted rounded-sm px-0.5 -mx-0.5 transition-colors duration-150"
              onClick={(e) => {
                e.stopPropagation();
                const cleanWord = word.trim().replace(/[.,!?;:'"()[\]{}]/g, '');
                if (cleanWord) {
                  setIsDictionaryOpen(true);
                  lookupWord(cleanWord, lang, i18n.language, context);
                }
              }}
            >
              {word}
            </span>
          );
        })}
      </>
    );
  }, [lookupWord, i18n.language]);

  const closeDictionary = useCallback(() => {
    setIsDictionaryOpen(false);
    resetDictionary();
  }, [resetDictionary]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with App Language Selector */}
      <header className="border-b border-border/40 bg-card/30 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground tracking-tight">
            Translate
          </h1>
          
          <Select value={i18n.language} onValueChange={(lang) => i18n.changeLanguage(lang)}>
            <SelectTrigger className="w-[140px] h-9 border-0 bg-card/50 hover:bg-card gap-2">
              <Globe className="h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ko">{t("korean")}</SelectItem>
              <SelectItem value="ja">{t("japanese")}</SelectItem>
              <SelectItem value="en">{t("english")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Translation Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-3xl space-y-5">
          {/* Language Selector */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value as "ko" | "ja" | "en")}
              className="px-5 py-2.5 rounded-xl bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted border-0 cursor-pointer focus:ring-2 focus:ring-primary"
            >
              <option value="ko">{t("korean")}</option>
              <option value="ja">{t("japanese")}</option>
              <option value="en">{t("english")}</option>
            </select>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={swapLanguages}
              className="rounded-full h-9 w-9 hover:rotate-180 transition-all duration-300"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as "ko" | "ja" | "en")}
              className="px-5 py-2.5 rounded-xl bg-card text-sm font-medium text-foreground transition-colors hover:bg-muted border-0 cursor-pointer focus:ring-2 focus:ring-primary"
            >
              <option value="ko">{t("korean")}</option>
              <option value="ja">{t("japanese")}</option>
              <option value="en">{t("english")}</option>
            </select>
          </div>

          {/* Translation Boxes */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="relative">
              <Textarea
                placeholder={t("enterText")}
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                className="min-h-[180px] resize-none text-[15px] leading-relaxed border-0 bg-card shadow-sm rounded-2xl p-4 pr-20 focus-visible:ring-1"
                autoFocus
              />
              {sourceText && (
                <div className="absolute top-3 right-3 flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/10"
                    onClick={() => handleCopy(sourceText)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/10"
                    onClick={() => handleSpeak(sourceText, sourceLang)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="relative">
              <div 
                className="min-h-[180px] text-[15px] leading-relaxed border-0 bg-muted/40 shadow-sm rounded-2xl p-4 pr-20"
                style={{ 
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}
              >
                {targetText ? renderClickableText(targetText, targetLang, targetText) : <span className="text-muted-foreground">{t("translate")}...</span>}
              </div>
              {isTranslating && (
                <div className="absolute top-2 right-2 text-xs text-muted-foreground flex items-center gap-1.5">
                  <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  {t("translating")}
                </div>
              )}
              {!isTranslating && targetText && (
                <div className="absolute top-3 right-3 flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/10"
                    onClick={() => handleCopy(targetText)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-primary/10"
                    onClick={() => handleSpeak(targetText, targetLang)}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Recent Translations */}
      {recentTranslations.length > 0 && (
        <aside className="border-t bg-muted/20">
          <div className="max-w-3xl mx-auto px-4 py-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("recent3")}</h3>
              {selectedIds.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="h-7 px-3 text-xs text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1.5" />
                  {t("bulkDelete")} ({selectedIds.size})
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {recentTranslations.map((translation) => (
                <div
                  key={translation.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-card hover:shadow-sm transition-all group"
                >
                  <Checkbox
                    checked={selectedIds.has(translation.id)}
                    onCheckedChange={() => toggleSelect(translation.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-2.5">
                    {/* Source text with romanization */}
                    <div className="space-y-0.5">
                      <div className="flex items-start gap-2 group/text">
                        <p className="text-[15px] text-foreground leading-relaxed flex-1">
                          {renderClickableText(translation.source_text, translation.source_lang, translation.source_text)}
                        </p>
                        <div className="flex gap-1 opacity-0 group-hover/text:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-primary/10"
                            onClick={() => handleCopy(translation.source_text)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-primary/10"
                            onClick={() => handleSpeak(translation.source_text, translation.source_lang)}
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {translation.source_romanization && (
                        <p className="text-xs text-muted-foreground/60 italic">{translation.source_romanization}</p>
                      )}
                    </div>

                    {/* Natural translation with romanization */}
                    <div className="space-y-0.5">
                      <div className="flex items-start gap-2 group/text">
                        <p className="text-[15px] text-primary/90 leading-relaxed font-medium flex-1">
                          {renderClickableText(translation.target_text, translation.target_lang, translation.target_text)}
                        </p>
                        <div className="flex gap-1 opacity-0 group-hover/text:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-primary/10"
                            onClick={() => handleCopy(translation.target_text)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full hover:bg-primary/10"
                            onClick={() => handleSpeak(translation.target_text, translation.target_lang)}
                          >
                            <Volume2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {translation.target_romanization && (
                        <p className="text-xs text-muted-foreground/60 italic">{translation.target_romanization}</p>
                      )}
                    </div>

                    {/* Literal translation toggle - clearly visible */}
                    {translation.literal_translation && (
                      <div className="pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleLiteral(translation.id)}
                          className="h-8 px-3 text-xs font-medium border-primary/20 hover:bg-primary/5"
                        >
                          {showLiteral[translation.id] ? (
                            <>
                              <ChevronUp className="h-3 w-3 mr-1.5" />
                              {t("literal")}
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3 mr-1.5" />
                              {t("literal")}
                            </>
                          )}
                        </Button>
                        
                        {showLiteral[translation.id] && (
                          <div className="mt-2 pl-3 border-l-2 border-primary/20 bg-primary/5 -ml-3 py-2 pr-3">
                            <p className="text-xs text-foreground/80 leading-relaxed">
                              {renderClickableText(translation.literal_translation || "", translation.target_lang, translation.literal_translation || "")}
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
                        onClick={() => handleFeedback(translation, 'positive')}
                        className="h-8 px-3 text-xs hover:bg-green-500/10"
                      >
                        {t("good")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleFeedback(translation, 'negative')}
                        className="h-8 px-3 text-xs hover:bg-orange-500/10"
                      >
                        {t("feelsOff")}
                      </Button>
                    </div>
                  </div>

                  {/* Delete button only */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleDelete(translation.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
