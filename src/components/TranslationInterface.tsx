import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeftRight, WifiOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { franc } from "franc-min";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { useDictionary } from "@/hooks/useDictionary";
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
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { User } from "@supabase/supabase-js";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const isOnline = useOnlineStatus();
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
  const [noiseCancellation, setNoiseCancellation] = useState(() => {
    const saved = localStorage.getItem('noiseCancellation');
    return saved ? JSON.parse(saved) : true;
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  
  const { lookupWord, currentEntry, currentWord, isLoading: isDictionaryLoading, reset: resetDictionary } = useDictionary();

  // Speech recognition hook with noise cancellation and language detection
  const [detectedLangFromSpeech, setDetectedLangFromSpeech] = useState<string | null>(null);
  
  const { isListening, transcript, startListening, stopListening, resetTranscript, isSupported, audioLevel, detectedLanguage } = useSpeechRecognition(
    sourceLang, 
    {
      noiseCancellation,
      onLanguageDetected: (lang) => setDetectedLangFromSpeech(lang),
    }
  );

  // Handle automatic language switching when language is detected from speech
  useEffect(() => {
    if (detectedLangFromSpeech && detectedLangFromSpeech !== sourceLang && isListening) {
      // Stop current recognition
      stopListening();
      
      // Update languages
      const newSourceLang = detectedLangFromSpeech as typeof sourceLang;
      let newTargetLang: typeof targetLang;
      
      // Smart target language selection
      if (detectedLangFromSpeech === "ko") newTargetLang = "en";
      else if (detectedLangFromSpeech === "ja") newTargetLang = "ko";
      else if (detectedLangFromSpeech === "en") newTargetLang = "ko";
      else if (detectedLangFromSpeech === "zh") newTargetLang = "en";
      else newTargetLang = "en";
      
      setSourceLang(newSourceLang);
      setTargetLang(newTargetLang);
      
      // Update localStorage directly
      localStorage.setItem('lastSourceLang', newSourceLang);
      localStorage.setItem('lastTargetLang', newTargetLang);
      
      // Update recent language pairs
      const key = 'recentLangPairs';
      const saved = localStorage.getItem(key);
      const prev = saved ? JSON.parse(saved) : [];
      const newPair = { source: newSourceLang, target: newTargetLang };
      const filtered = prev.filter((p: any) => !(p.source === newSourceLang && p.target === newTargetLang));
      const updated = [newPair, ...filtered].slice(0, 3);
      localStorage.setItem(key, JSON.stringify(updated));
      setRecentLangPairs(updated);
      
      toast.success(`언어 자동 전환: ${detectedLangFromSpeech.toUpperCase()} → ${newTargetLang.toUpperCase()}`, {
        duration: 2500,
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
      const msg = noiseCancellation 
        ? "음성 인식 시작 (노이즈 캔슬링 활성화)" 
        : "음성 인식 시작";
      toast.success(t("listeningStarted") || msg);
    }
  }, [isListening, isSupported, startListening, stopListening, resetTranscript, noiseCancellation, t]);

  // Toggle noise cancellation
  const toggleNoiseCancellation = useCallback(() => {
    const newValue = !noiseCancellation;
    setNoiseCancellation(newValue);
    localStorage.setItem('noiseCancellation', JSON.stringify(newValue));
    
    const msg = newValue 
      ? "노이즈 캔슬링이 활성화되었습니다" 
      : "노이즈 캔슬링이 비활성화되었습니다";
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
          literal_translation: quickResult.literal || "",
        };
        await saveTranslation(newTranslation);
        return;
      }
    }

    // Check cache second
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
      const { data, error } = await supabase.functions.invoke("translate", {
        body: {
          text: sourceText,
          sourceLang,
          targetLang,
        },
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
        literal_translation: literal,
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
  }, [sourceText, sourceLang, targetLang, abortController, isOnline, t, saveTranslation]);

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

    // Use shorter delay for quick translations, longer for AI
    const delay = shouldUseQuickTranslation(sourceText) ? 300 : 800;
    const translateTimer = setTimeout(() => {
      handleTranslate();
    }, delay);

    return () => clearTimeout(translateTimer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText, sourceLang, targetLang]);

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

  const toggleFavorite = useCallback(async (id: string) => {
    if (user) {
      // Toggle in database
      const translation = recentTranslations.find(t => t.id === id);
      if (!translation) return;

      try {
        const { error } = await supabase
          .from("translations")
          .update({ is_favorite: !translation.is_favorite })
          .eq("id", id)
          .eq("user_id", user.id);
        
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
        const updated = translations.map((t: Translation) => 
          t.id === id ? { ...t, is_favorite: !t.is_favorite } : t
        );
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

  const handleSpeak = useCallback(async (text: string, lang: string, romanization?: string) => {
    try {
      // For Japanese, prefer romanization if available to reduce pronunciation errors
      const textToSpeak = lang === 'ja' && romanization ? romanization : text;
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: textToSpeak, lang }
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
      <div className="h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden">
        <AppSidebar
          recentTranslations={recentTranslations}
          selectedIds={selectedIds}
          showLiteral={showLiteral}
          onToggleSelect={toggleSelect}
          onToggleLiteral={toggleLiteral}
          onToggleFavorite={toggleFavorite}
          onDelete={handleDelete}
          onBulkDelete={handleBulkDelete}
          onCopy={handleCopy}
          onSpeak={handleSpeak}
          onTextSelect={handleTextSelection}
          onFeedback={handleFeedback}
          noRomanizationLangs={noRomanizationLangs}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <SidebarTrigger className="h-9 w-9 shrink-0" />
                  <h1 className="text-sm sm:text-base font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent truncate">
                    번역기
                  </h1>
                </div>
                
                <div className="flex items-center gap-1.5 sm:gap-2">
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
                    variant="ghost"
                    size="icon"
                    onClick={swapLanguages}
                    className="h-9 w-9 rounded-full hover:bg-accent hover:rotate-180 transition-all duration-300 shrink-0"
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
                
                <HamburgerMenu user={user} onUserChange={setUser} />
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col px-2 sm:px-4 py-2 sm:py-3 animate-fade-in overflow-y-auto touch-pan-y overscroll-contain">
            <div className="w-full flex-1 flex flex-col gap-2 sm:gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {!isOnline && (
                <Alert className="bg-warning/10 border-warning/30 animate-fade-in">
                  <WifiOff className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning text-sm">
                    {t("offlineMode") || "오프라인 모드 - 최근 번역과 캐시된 번역만 조회할 수 있습니다"}
                  </AlertDescription>
                </Alert>
              )}

              <div className={`flex-1 flex flex-col gap-2 sm:gap-3 transition-all duration-500 ${sourceText.trim() ? '' : 'justify-center'}`}>
                <div className={`transition-all duration-500 ${sourceText.trim() ? 'opacity-100 scale-100' : 'opacity-100 scale-105'}`}>
                  <TranslationBox
                    key={`source-${sourceLang}`}
                    value={sourceText}
                    onChange={setSourceText}
                    onCopy={() => handleCopy(sourceText)}
                    onSpeak={() => handleSpeak(sourceText, sourceLang, sourceRomanization)}
                    onTextSelect={(e) => sourceText && handleTextSelection(e, sourceLang, sourceText)}
                    placeholder={t("enterText")}
                    isEditable
                    romanization={!noRomanizationLangs.includes(sourceLang) ? sourceRomanization : undefined}
                    onMicClick={handleMicClick}
                    isListening={isListening}
                    noiseCancellation={noiseCancellation}
                    onToggleNoiseCancellation={toggleNoiseCancellation}
                    audioLevel={audioLevel}
                  />
                </div>
                
                {sourceText.trim() && (
                  <div className="animate-slide-up">
                    <TranslationResultBox
                      key={`target-${targetLang}`}
                      naturalTranslation={targetText}
                      literalTranslation={literalTranslation}
                      romanization={!noRomanizationLangs.includes(targetLang) ? targetRomanization : undefined}
                      onCopy={() => handleCopy(targetText)}
                      onSpeak={() => handleSpeak(targetText, targetLang, targetRomanization)}
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
                )}
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

          <VoiceInputOnboarding
            open={showOnboarding}
            onOpenChange={setShowOnboarding}
            onComplete={() => {
              setShowOnboarding(false);
              // Start listening after onboarding
              setTimeout(() => {
                resetTranscript();
                setSourceText("");
                startListening();
                const msg = noiseCancellation 
                  ? "음성 인식 시작 (노이즈 캔슬링 활성화)" 
                  : "음성 인식 시작";
                toast.success(t("listeningStarted") || msg);
              }, 300);
            }}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};
