import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ArrowLeftRight, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { franc } from "franc-min";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useDictionary } from "@/hooks/useDictionary";
import { useVocabulary } from "@/hooks/useVocabulary";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { attemptQuickTranslation, shouldUseQuickTranslation } from "@/utils/quickTranslation";
import { DictionarySheet } from "./DictionarySheet";
import { TranslationBox } from "./TranslationBox";
import { TranslationResultBox } from "./TranslationResultBox";
import { LanguageSelector } from "./LanguageSelector";
import { HamburgerMenu } from "./HamburgerMenu";
import { AppSidebar } from "./AppSidebar";
import { VoiceInputOnboarding } from "./VoiceInputOnboarding";
import { ImageTranslationTab } from "./ImageTranslationTab";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TranslationStyleSelector } from "./TranslationStyleSelector";
import { cleanAllCaches } from "@/utils/cacheManager";
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
  const {
    t,
    i18n
  } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const isOnline = useOnlineStatus();
  const [sourceText, setSourceText] = useState("");
  const [targetText, setTargetText] = useState("");
  const [literalTranslation, setLiteralTranslation] = useState("");
  const [sourceRomanization, setSourceRomanization] = useState("");
  const [targetRomanization, setTargetRomanization] = useState("");
  const [exampleSentence, setExampleSentence] = useState("");
  const [sourceLang, setSourceLang] = useState<"ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr">(() => {
    const saved = localStorage.getItem('lastSourceLang');
    return saved as any || "ko";
  });
  const [targetLang, setTargetLang] = useState<"ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr">(() => {
    const saved = localStorage.getItem('lastTargetLang');
    return saved as any || "en";
  });
  const [recentLangPairs, setRecentLangPairs] = useState<Array<{
    source: string;
    target: string;
  }>>(() => {
    const saved = localStorage.getItem('recentLangPairs');
    return saved ? JSON.parse(saved) : [];
  });
  const [isTranslating, setIsTranslating] = useState(false);
  const [recentTranslations, setRecentTranslations] = useState<Translation[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showLiteral, setShowLiteral] = useState<Record<string, boolean>>({});
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  const [currentDictLang, setCurrentDictLang] = useState<string>("");
  const [noiseCancellation, setNoiseCancellation] = useState(() => {
    const saved = localStorage.getItem('noiseCancellation');
    return saved ? JSON.parse(saved) : true;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [translationStyle, setTranslationStyle] = useState<{
    formality: "formal" | "informal";
    domain: "casual" | "business" | "academic";
    translationType: "literal" | "natural";
  }>(() => {
    const saved = localStorage.getItem('translationStyle');
    return saved ? JSON.parse(saved) : {
      formality: "formal",
      domain: "casual",
      translationType: "natural"
    };
  });
  const [recommendedPreset, setRecommendedPreset] = useState<string>("");
  const lastRecommendationTextRef = useRef<string>("");
  const translateTimeoutRef = useRef<NodeJS.Timeout>();
  const {
    lookupWord,
    currentEntry,
    currentWord,
    isLoading: isDictionaryLoading,
    reset: resetDictionary
  } = useDictionary();
  const {
    addWord,
    isWordInVocabulary
  } = useVocabulary();

  // Speech recognition hook with noise cancellation and language detection
  const [detectedLangFromSpeech, setDetectedLangFromSpeech] = useState<string | null>(null);
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
    audioLevel,
    detectedLanguage
  } = useSpeechRecognition(sourceLang, {
    noiseCancellation,
    onLanguageDetected: lang => setDetectedLangFromSpeech(lang)
  });

  // Handle automatic language switching when language is detected from speech
  useEffect(() => {
    if (detectedLangFromSpeech && detectedLangFromSpeech !== sourceLang && isListening) {
      // Stop current recognition
      stopListening();

      // Update languages
      const newSourceLang = detectedLangFromSpeech as typeof sourceLang;
      let newTargetLang: typeof targetLang;

      // Smart target language selection
      if (detectedLangFromSpeech === "ko") newTargetLang = "en";else if (detectedLangFromSpeech === "ja") newTargetLang = "ko";else if (detectedLangFromSpeech === "en") newTargetLang = "ko";else if (detectedLangFromSpeech === "zh") newTargetLang = "en";else newTargetLang = "en";
      setSourceLang(newSourceLang);
      setTargetLang(newTargetLang);

      // Update localStorage directly
      localStorage.setItem('lastSourceLang', newSourceLang);
      localStorage.setItem('lastTargetLang', newTargetLang);

      // Update recent language pairs
      const key = 'recentLangPairs';
      const saved = localStorage.getItem(key);
      const prev = saved ? JSON.parse(saved) : [];
      const newPair = {
        source: newSourceLang,
        target: newTargetLang
      };
      const filtered = prev.filter((p: any) => !(p.source === newSourceLang && p.target === newTargetLang));
      const updated = [newPair, ...filtered].slice(0, 3);
      localStorage.setItem(key, JSON.stringify(updated));
      setRecentLangPairs(updated);
      toast.success(`언어 자동 전환: ${detectedLangFromSpeech.toUpperCase()} → ${newTargetLang.toUpperCase()}`, {
        duration: 2500
      });

      // Restart recognition with new language after a short delay
      setTimeout(() => {
        setDetectedLangFromSpeech(null);
        startListening();
      }, 500);
    }
  }, [detectedLangFromSpeech, sourceLang, isListening, stopListening, startListening]);

  // Update sourceText when speech recognition transcript changes
  useEffect(() => {
    if (transcript) {
      setSourceText(transcript);
    }
  }, [transcript]);

  // Handle microphone button click
  const handleMicClick = useCallback(() => {
    if (!isSupported) {
      toast.error(t("speechNotSupported") || "음성 인식이 지원되지 않는 브라우저입니다");
      return;
    }

    // Check if this is the first time using voice input
    const onboardingShown = localStorage.getItem("voiceInputOnboardingShown");
    if (!onboardingShown && !isListening) {
      setShowOnboarding(true);
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      setSourceText("");
      startListening();
      const msg = noiseCancellation ? "음성 인식 시작 (노이즈 캔슬링 활성화)" : "음성 인식 시작";
      toast.success(t("listeningStarted") || msg);
    }
  }, [isListening, isSupported, startListening, stopListening, resetTranscript, noiseCancellation, t]);

  // Toggle noise cancellation
  const toggleNoiseCancellation = useCallback(() => {
    const newValue = !noiseCancellation;
    setNoiseCancellation(newValue);
    localStorage.setItem('noiseCancellation', JSON.stringify(newValue));
    const msg = newValue ? "노이즈 캔슬링이 활성화되었습니다" : "노이즈 캔슬링이 비활성화되었습니다";
    toast.success(msg);

    // If currently listening, restart to apply new settings
    if (isListening) {
      stopListening();
      setTimeout(() => {
        resetTranscript();
        startListening();
      }, 100);
    }
  }, [noiseCancellation, isListening, stopListening, startListening, resetTranscript]);

  // Languages that don't need romanization (use Latin alphabet)
  const noRomanizationLangs = useMemo(() => ['en', 'es', 'fr', 'de', 'pt', 'it', 'id', 'tr', 'vi'], []);

  // Load translations from DB or localStorage
  const loadTranslations = useCallback(async () => {
    if (user) {
      // Load from database
      try {
        const {
          data,
          error
        } = await supabase.from("translations").select("*").eq("user_id", user.id).order("created_at", {
          ascending: false
        }).limit(50);
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
        const {
          error
        } = await supabase.from("translations").insert({
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
          masked_target_text: translation.masked_target_text
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
      const filtered = translations.filter((t: Translation) => !(t.source_text === translation.source_text && t.source_lang === translation.source_lang && t.target_lang === translation.target_lang));
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
      const newPair = {
        source,
        target
      };
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
  const handleTranslate = useCallback(async (retryCount = 0) => {
    if (!sourceText.trim()) {
      return;
    }

    // Cancel previous request if exists
    if (abortController) {
      abortController.abort();
    }

    // Try quick translation first (no AI, instant)
    if (shouldUseQuickTranslation(sourceText)) {
      const quickResult = attemptQuickTranslation(sourceText, sourceLang, targetLang);
      if (quickResult) {
        setTargetText(quickResult.translation);
        setLiteralTranslation(quickResult.literal || "");
        setSourceRomanization(quickResult.sourceRom || "");
        setTargetRomanization(quickResult.targetRom || "");
        setExampleSentence("");

        // Auto-save quick translation to history
        const newTranslation: Translation = {
          id: Date.now().toString(),
          source_text: sourceText,
          target_text: quickResult.translation,
          source_lang: sourceLang,
          target_lang: targetLang,
          is_favorite: false,
          created_at: new Date().toISOString(),
          content_classification: "",
          masked_source_text: null,
          masked_target_text: null,
          source_romanization: "",
          target_romanization: "",
          literal_translation: quickResult.literal || ""
        };
        await saveTranslation(newTranslation);
        return;
      }
    }

    // Check cache second (now includes style) - prioritize cache for speed
    const styleKey = JSON.stringify(translationStyle);
    const cacheKey = `tr_${sourceLang}_${targetLang}_${styleKey}_${sourceText}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const {
          translation,
          literal,
          srcRom,
          tgtRom,
          example,
          timestamp
        } = JSON.parse(cached);
        // Use cache if less than 7 days old (extended for better performance)
        if (Date.now() - timestamp < 604800000) {
          setTargetText(translation);
          setLiteralTranslation(literal);
          setSourceRomanization(srcRom);
          setTargetRomanization(tgtRom);
          setExampleSentence(example || "");
          return;
        }
      } catch (e) {
        // Invalid cache, continue with API call
      }
    }

    // If offline and no cache, show error
    if (!isOnline) {
      toast.error(t("offlineNoCacheError") || "오프라인 상태에서는 캐시된 번역만 사용할 수 있습니다");
      return;
    }
    setIsTranslating(true);

    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    // Set timeout for request (15 seconds)
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke("translate", {
        body: {
          text: sourceText,
          sourceLang,
          targetLang,
          style: translationStyle
        }
      });
      clearTimeout(timeoutId);
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      const translation = data.translation;
      const literal = data.literalTranslation || "";
      const srcRomanization = data.sourceRomanization || "";
      const tgtRomanization = data.targetRomanization || "";
      const example = data.exampleSentence || "";

      // Cache result with timestamp (limit cache size to 50 for faster performance)
      try {
        const cacheData = {
          translation,
          literal,
          srcRom: srcRomanization,
          tgtRom: tgtRomanization,
          example,
          timestamp: Date.now()
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));

        // Clean old cache entries (keep max 50, remove entries older than 7 days)
        const keys = Object.keys(localStorage).filter(k => k.startsWith('tr_'));
        const now = Date.now();
        const sevenDays = 7 * 86400000;

        // Remove old entries
        keys.forEach(k => {
          try {
            const cached = JSON.parse(localStorage.getItem(k) || '{}');
            if (!cached.timestamp || now - cached.timestamp > sevenDays) {
              localStorage.removeItem(k);
            }
          } catch {
            localStorage.removeItem(k);
          }
        });

        // If still too many, remove oldest
        const remainingKeys = Object.keys(localStorage).filter(k => k.startsWith('tr_'));
        if (remainingKeys.length > 50) {
          const keysWithTime = remainingKeys.map(k => {
            try {
              const cached = JSON.parse(localStorage.getItem(k) || '{}');
              return {
                key: k,
                time: cached.timestamp || 0
              };
            } catch {
              return {
                key: k,
                time: 0
              };
            }
          }).sort((a, b) => a.time - b.time);
          keysWithTime.slice(0, keysWithTime.length - 50).forEach(({
            key
          }) => {
            localStorage.removeItem(key);
          });
        }
      } catch (e) {
        // Cache full or error, continue without caching
      }
      setTargetText(translation);
      setLiteralTranslation(literal);
      setSourceRomanization(srcRomanization);
      setTargetRomanization(tgtRomanization);
      setExampleSentence(example);

      // Auto-save to history when translation completes
      const newTranslation: Translation = {
        id: Date.now().toString(),
        source_text: sourceText,
        target_text: translation,
        source_lang: sourceLang,
        target_lang: targetLang,
        is_favorite: false,
        created_at: new Date().toISOString(),
        content_classification: "",
        masked_source_text: null,
        masked_target_text: null,
        source_romanization: srcRomanization,
        target_romanization: tgtRomanization,
        literal_translation: literal
      };
      await saveTranslation(newTranslation);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error("Translation error:", error);

      // Handle timeout or network errors with retry
      if ((error.name === 'AbortError' || error.message?.includes('network')) && retryCount < 2) {
        toast.error(`네트워크 연결이 느립니다. 재시도 중... (${retryCount + 1}/2)`);
        setTimeout(() => handleTranslate(retryCount + 1), 1000);
        return;
      }
      if (error.name === 'AbortError') {
        toast.error("번역 요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.");
      } else {
        toast.error("번역 실패. 다시 시도해주세요.");
      }
    } finally {
      setIsTranslating(false);
      setAbortController(null);
    }
  }, [sourceText, sourceLang, targetLang, translationStyle, abortController, isOnline, t, saveTranslation]);

  // Auto-detect language with improved sensitivity
  useEffect(() => {
    if (sourceText.trim().length < 2) return;
    const detectTimer = setTimeout(() => {
      const detected = franc(sourceText, {
        minLength: 2
      });
      let detectedLang: "ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr" | null = null;
      if (detected === "kor") detectedLang = "ko";else if (detected === "jpn") detectedLang = "ja";else if (detected === "eng") detectedLang = "en";else if (detected === "cmn") detectedLang = "zh";else if (detected === "spa") detectedLang = "es";else if (detected === "fra") detectedLang = "fr";else if (detected === "deu") detectedLang = "de";else if (detected === "por") detectedLang = "pt";else if (detected === "ita") detectedLang = "it";else if (detected === "rus") detectedLang = "ru";else if (detected === "arb") detectedLang = "ar";else if (detected === "tha") detectedLang = "th";else if (detected === "vie") detectedLang = "vi";else if (detected === "ind") detectedLang = "id";else if (detected === "hin") detectedLang = "hi";else if (detected === "tur") detectedLang = "tr";
      if (detectedLang && detectedLang !== sourceLang) {
        let newTargetLang: typeof targetLang;
        if (detectedLang === "ko") newTargetLang = "en";else if (detectedLang === "ja") newTargetLang = "ko";else if (detectedLang === "en") newTargetLang = "ko";else if (detectedLang === "zh") newTargetLang = "en";else newTargetLang = "en";
        setSourceLang(detectedLang);
        setTargetLang(newTargetLang);
        updateLanguagePair(detectedLang, newTargetLang);
        toast.success(`${detectedLang.toUpperCase()} 자동 감지됨`, {
          duration: 1500
        });
      }
    }, 200);
    return () => clearTimeout(detectTimer);
  }, [sourceText, sourceLang, updateLanguagePair]);

  // Request AI style recommendation when source text changes (optimized - only when text is stable and different)
  useEffect(() => {
    if (!sourceText.trim() || sourceText.trim().length < 10) {
      if (recommendedPreset) setRecommendedPreset("");
      return;
    }

    // Skip if same text
    if (lastRecommendationTextRef.current === sourceText) {
      return;
    }
    const timer = setTimeout(async () => {
      // Double check text hasn't changed
      if (lastRecommendationTextRef.current === sourceText) return;
      lastRecommendationTextRef.current = sourceText;
      try {
        const {
          data
        } = await supabase.functions.invoke("translate", {
          body: {
            text: sourceText,
            sourceLang,
            targetLang,
            requestRecommendation: true
          }
        });
        if (data?.recommendedPreset) {
          setRecommendedPreset(data.recommendedPreset);
        }
      } catch (error) {
        console.error("Failed to get AI recommendation:", error);
      }
    }, 2000); // Increased debounce to reduce API calls

    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang, recommendedPreset]);

  // Auto-translate with debounce (optimized for speed)
  useEffect(() => {
    if (!sourceText.trim() || sourceText.trim().length < 2) {
      setTargetText("");
      setLiteralTranslation("");
      setSourceRomanization("");
      setTargetRomanization("");
      return;
    }

    // Shorter delays for faster translation
    const delay = shouldUseQuickTranslation(sourceText) ? 100 : 250;
    const translateTimer = setTimeout(() => {
      handleTranslate();
    }, delay);
    return () => clearTimeout(translateTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText, sourceLang, targetLang]);

  // Auth state listener and cache cleanup on mount
  useEffect(() => {
    // Clean expired caches on app start for better performance
    cleanAllCaches();
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: {
        subscription
      }
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
        const {
          error
        } = await supabase.from("translations").delete().eq("id", id).eq("user_id", user.id);
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
        const {
          error
        } = await supabase.from("translations").delete().in("id", Array.from(selectedIds)).eq("user_id", user.id);
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
      return {
        ...prev,
        [id]: isShowing
      };
    });
  }, []);
  const toggleFavorite = useCallback(async (id: string) => {
    if (user) {
      // Toggle in database
      const translation = recentTranslations.find(t => t.id === id);
      if (!translation) return;
      try {
        const {
          error
        } = await supabase.from("translations").update({
          is_favorite: !translation.is_favorite
        }).eq("id", id).eq("user_id", user.id);
        if (error) throw error;
        toast.success(translation.is_favorite ? t("removedFromFavorites") : t("addedToFavorites"));
        await loadTranslations();
      } catch (error) {
        console.error("Failed to toggle favorite:", error);
        toast.error(t("favoriteUpdateFailed"));
      }
    } else {
      // Toggle in localStorage
      const stored = localStorage.getItem('translations');
      if (stored) {
        const translations = JSON.parse(stored);
        const updated = translations.map((t: Translation) => t.id === id ? {
          ...t,
          is_favorite: !t.is_favorite
        } : t);
        localStorage.setItem('translations', JSON.stringify(updated));
        const translation = translations.find((t: Translation) => t.id === id);
        toast.success(translation?.is_favorite ? t("removedFromFavorites") : t("addedToFavorites"));
        loadTranslations();
      }
    }
  }, [user, recentTranslations, loadTranslations, t]);
  const handleFeedback = useCallback(async (translation: Translation, feedbackType: 'positive' | 'negative') => {
    try {
      console.log('Submitting feedback:', {
        translation_id: translation.id,
        source_text: translation.source_text,
        natural_translation: translation.target_text,
        literal_translation: translation.literal_translation,
        feedback_type: feedbackType,
        user_id: user?.id || null
      });
      const {
        data,
        error
      } = await supabase.from("translation_feedback").insert({
        source_text: translation.source_text,
        natural_translation: translation.target_text,
        literal_translation: translation.literal_translation,
        feedback_type: feedbackType,
        user_id: user?.id || null
      }).select();
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
  const handleSpeak = useCallback(async (text: string, lang: string, romanization?: string) => {
    try {
      // Check if browser supports Web Speech API
      if (!('speechSynthesis' in window)) {
        toast.error('브라우저가 음성 재생을 지원하지 않습니다');
        return;
      }

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // For Japanese, prefer romanization if available to reduce pronunciation errors
      const textToSpeak = lang === 'ja' && romanization ? romanization : text;

      // Create speech utterance
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Map language codes to speech synthesis language codes
      const langMap: Record<string, string> = {
        'ko': 'ko-KR',
        'ja': 'ja-JP',
        'en': 'en-US',
        'zh': 'zh-CN',
        'es': 'es-ES',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'pt': 'pt-PT',
        'it': 'it-IT',
        'ru': 'ru-RU',
        'ar': 'ar-SA',
        'th': 'th-TH',
        'vi': 'vi-VN',
        'id': 'id-ID',
        'hi': 'hi-IN',
        'tr': 'tr-TR'
      };
      const targetLang = langMap[lang] || 'en-US';
      utterance.lang = targetLang;

      // Wait for voices to load if not already loaded
      const getVoices = (): SpeechSynthesisVoice[] => {
        return window.speechSynthesis.getVoices();
      };
      let voices = getVoices();

      // If voices not loaded yet, wait for them
      if (voices.length === 0) {
        await new Promise<void>(resolve => {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = getVoices();
            resolve();
          };
          // Fallback timeout
          setTimeout(resolve, 1000);
        });
      }

      // Select the best quality voice for the language
      // Prefer Google voices (online, high quality) over local voices
      const languageVoices = voices.filter(voice => voice.lang.startsWith(targetLang.split('-')[0]));
      let selectedVoice: SpeechSynthesisVoice | null = null;

      // Priority 1: Google voices (online, neural TTS)
      selectedVoice = languageVoices.find(voice => voice.name.includes('Google') && !voice.localService) || null;

      // Priority 2: Microsoft voices (also good quality)
      if (!selectedVoice) {
        selectedVoice = languageVoices.find(voice => voice.name.includes('Microsoft') && !voice.localService) || null;
      }

      // Priority 3: Any online voice
      if (!selectedVoice) {
        selectedVoice = languageVoices.find(voice => !voice.localService) || null;
      }

      // Priority 4: Any voice matching the language
      if (!selectedVoice) {
        selectedVoice = languageVoices[0] || null;
      }
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('Selected voice:', selectedVoice.name, selectedVoice.lang);
      }
      utterance.rate = 0.95; // Slightly slower for better clarity
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Speak the text
      window.speechSynthesis.speak(utterance);
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
        setCurrentDictLang(lang);
        lookupWord(cleanText, lang, i18n.language, context);
      }
    }
  }, [lookupWord, i18n.language]);
  const handleTextSelectionFromResult = useCallback((selectedText: string, lang: string) => {
    // Dictionary only supports ko, ja, en, zh
    const supportedDictionaryLangs = ['ko', 'ja', 'en', 'zh'];
    if (!supportedDictionaryLangs.includes(lang)) {
      return;
    }
    if (selectedText && selectedText.length > 0) {
      const cleanText = selectedText.replace(/[.,!?;:'"()[\]{}]/g, '');
      if (cleanText) {
        setIsDictionaryOpen(true);
        setCurrentDictLang(lang);
        lookupWord(cleanText, lang, i18n.language, targetText);
      }
    }
  }, [lookupWord, i18n.language, targetText]);
  const handleDictionarySearch = useCallback((word: string, lang: string) => {
    const supportedDictionaryLangs = ['ko', 'ja', 'en', 'zh'];
    if (!supportedDictionaryLangs.includes(lang)) {
      toast.error('해당 언어는 사전 검색을 지원하지 않습니다.');
      return;
    }
    setIsDictionaryOpen(true);
    setCurrentDictLang(lang);
    lookupWord(word, lang, i18n.language);
  }, [lookupWord, i18n.language]);
  const closeDictionary = useCallback(() => {
    setIsDictionaryOpen(false);
    resetDictionary();
  }, [resetDictionary]);
  const handleAddToVocabulary = useCallback((word: string, language: string, entry: any) => {
    addWord(word, language, entry);
  }, [addWord]);
  const handleAddTranslationToVocabulary = useCallback(async () => {
    if (!sourceText || !targetText) {
      toast.error("번역 결과가 없습니다.");
      return;
    }
    const definition = {
      pos: "phrase",
      definitions: [targetText],
      romanization: targetRomanization || undefined,
      example: literalTranslation || targetText
    };
    await addWord(sourceText, sourceLang, definition);
  }, [sourceText, targetText, sourceLang, targetRomanization, literalTranslation, addWord]);
  return <SidebarProvider defaultOpen={false}>
      <div className="h-screen w-full bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden flex flex-row">
        <AppSidebar recentTranslations={recentTranslations} selectedIds={selectedIds} showLiteral={showLiteral} onToggleSelect={toggleSelect} onToggleLiteral={toggleLiteral} onToggleFavorite={toggleFavorite} onDelete={handleDelete} onBulkDelete={handleBulkDelete} onCopy={handleCopy} onSpeak={handleSpeak} onTextSelect={handleTextSelection} onFeedback={handleFeedback} noRomanizationLangs={noRomanizationLangs} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b bg-background/95 backdrop-blur-lg sticky top-0 z-10 shadow-sm pt-safe">
            <div className="px-3 sm:px-4 py-3 sm:py-3.5">
              <div className="flex items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <SidebarTrigger className="h-10 w-10 sm:h-11 sm:w-11 shrink-0" />
                  <h1 className="text-base sm:text-lg font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">
                    {t("translator") || "번역기"}
                  </h1>
                </div>
                
                <HamburgerMenu user={user} onUserChange={setUser} />
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center justify-start px-3 sm:px-4 py-4 sm:py-6 pb-20 md:pb-6 animate-fade-in overflow-y-auto touch-pan-y overscroll-contain">
            <div className="w-full max-w-4xl flex flex-col gap-4 sm:gap-5">
              {!isOnline && <Alert className="bg-warning/10 border-warning/30 animate-fade-in">
                  <WifiOff className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning text-sm">
                    {t("offlineMode") || "오프라인 모드 - 최근 번역과 캐시된 번역만 조회할 수 있습니다"}
                  </AlertDescription>
                </Alert>}

              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-4">
                  <TabsTrigger value="text">{t("textTranslation") || "텍스트 번역"}</TabsTrigger>
                  <TabsTrigger value="image">{t("imageTranslation") || "이미지 번역"}</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="flex flex-col gap-4 sm:gap-5">
                  <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <LanguageSelector value={sourceLang} onChange={newLang => {
                    setSourceLang(newLang as any);
                    updateLanguagePair(newLang, targetLang);
                  }} recentPairs={recentLangPairs} type="source" showAutoDetect={sourceText.trim().length >= 2} />
                    
                    <Button variant="ghost" size="icon" onClick={swapLanguages} className="h-9 w-9 rounded-full hover:bg-accent hover:rotate-180 transition-all duration-300 shrink-0">
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                    
                    <LanguageSelector value={targetLang} onChange={newLang => {
                    setTargetLang(newLang as any);
                    updateLanguagePair(sourceLang, newLang);
                  }} recentPairs={recentLangPairs} type="target" />
                  </div>

                  {/* Translation Style Selector */}
                  <TranslationStyleSelector selectedStyle={translationStyle} onStyleChange={newStyle => {
                  setTranslationStyle(newStyle);
                  localStorage.setItem('translationStyle', JSON.stringify(newStyle));
                }} />
                  
                  <div>
                    <TranslationBox key={`source-${sourceLang}`} value={sourceText} onChange={setSourceText} onCopy={() => handleCopy(sourceText)} onSpeak={() => handleSpeak(sourceText, sourceLang, sourceRomanization)} onTextSelect={e => sourceText && handleTextSelection(e, sourceLang, sourceText)} placeholder={t("enterText")} isEditable romanization={!noRomanizationLangs.includes(sourceLang) ? sourceRomanization : undefined} onMicClick={handleMicClick} isListening={isListening} noiseCancellation={noiseCancellation} onToggleNoiseCancellation={toggleNoiseCancellation} audioLevel={audioLevel} />
                  </div>
                  
                  {sourceText.trim() && <div>
                      <TranslationResultBox key={`target-${targetLang}`} naturalTranslation={targetText} literalTranslation={literalTranslation} romanization={!noRomanizationLangs.includes(targetLang) ? targetRomanization : undefined} exampleSentence={exampleSentence} onCopy={() => handleCopy(targetText)} onSpeak={() => handleSpeak(targetText, targetLang, targetRomanization)} onTextSelect={(selectedText, lang) => handleTextSelectionFromResult(selectedText, lang)} onAddToVocabulary={handleAddTranslationToVocabulary} onFeedback={type => {
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
                  }} isTranslating={isTranslating} sourceLang={sourceLang} targetLang={targetLang} />
                    </div>}
                </TabsContent>

                <TabsContent value="image">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <LanguageSelector value={sourceLang} onChange={newLang => setSourceLang(newLang as any)} recentPairs={recentLangPairs} type="source" />
                    
                    <Button variant="ghost" size="icon" onClick={swapLanguages} className="h-9 w-9 rounded-full hover:bg-accent hover:rotate-180 transition-all duration-300 shrink-0">
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                    
                    <LanguageSelector value={targetLang} onChange={newLang => setTargetLang(newLang as any)} recentPairs={recentLangPairs} type="target" />
                  </div>

                  <ImageTranslationTab sourceLang={sourceLang} targetLang={targetLang} onSourceLangChange={setSourceLang} onTargetLangChange={setTargetLang} recentPairs={recentLangPairs} />
                </TabsContent>
              </Tabs>
            </div>
          </main>

          <DictionarySheet isOpen={isDictionaryOpen} onClose={closeDictionary} word={currentWord} entry={currentEntry} isLoading={isDictionaryLoading} language={currentDictLang} onAddToVocabulary={handleAddToVocabulary} isInVocabulary={isWordInVocabulary(currentWord, currentDictLang)} />

          <VoiceInputOnboarding open={showOnboarding} onOpenChange={setShowOnboarding} onComplete={() => {
          setShowOnboarding(false);
          // Start listening after onboarding
          setTimeout(() => {
            resetTranscript();
            setSourceText("");
            startListening();
            const msg = noiseCancellation ? "음성 인식 시작 (노이즈 캔슬링 활성화)" : "음성 인식 시작";
            toast.success(t("listeningStarted") || msg);
          }, 300);
        }} />
        </div>
      </div>
    </SidebarProvider>;
};