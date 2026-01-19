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
import { useIsMobile } from "@/hooks/use-mobile";
import { attemptQuickTranslation, shouldUseQuickTranslation } from "@/utils/quickTranslation";
import { splitIntoChunks, combineChunks, shouldChunkText } from "@/utils/textChunking";
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
import { TranslationHistoryConsent } from "./TranslationHistoryConsent";
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
  const isMobile = useIsMobile();
  const [user, setUser] = useState<User | null>(null);
  const [saveHistoryEnabled, setSaveHistoryEnabled] = useState<boolean>(false);
  const isOnline = useOnlineStatus();
  // Session state persistence - restore last translation on mount
  const [sourceText, setSourceText] = useState(() => {
    const saved = sessionStorage.getItem('translationSessionState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        return state.sourceText || "";
      } catch { return ""; }
    }
    return "";
  });
  const [targetText, setTargetText] = useState(() => {
    const saved = sessionStorage.getItem('translationSessionState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        return state.targetText || "";
      } catch { return ""; }
    }
    return "";
  });
  const [literalTranslation, setLiteralTranslation] = useState(() => {
    const saved = sessionStorage.getItem('translationSessionState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        return state.literalTranslation || "";
      } catch { return ""; }
    }
    return "";
  });
  const [sourceRomanization, setSourceRomanization] = useState(() => {
    const saved = sessionStorage.getItem('translationSessionState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        return state.sourceRomanization || "";
      } catch { return ""; }
    }
    return "";
  });
  const [targetRomanization, setTargetRomanization] = useState(() => {
    const saved = sessionStorage.getItem('translationSessionState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        return state.targetRomanization || "";
      } catch { return ""; }
    }
    return "";
  });
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
  const [showHistoryConsent, setShowHistoryConsent] = useState(false);
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
  const [speechSpeed, setSpeechSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('speechSpeed');
    return saved ? parseFloat(saved) : 1.0;
  });
  const lastRecommendationTextRef = useRef<string>("");
  const translateTimeoutRef = useRef<NodeJS.Timeout>();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedTextRef = useRef<string>("");
  const pendingTranslationRef = useRef<Translation | null>(null);
  
  // Papago-style UI states
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(() => {
    const saved = sessionStorage.getItem('translationSessionState');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        return !!state.targetText;
      } catch { return false; }
    }
    return false;
  });
  const [savedWordsFromTranslation, setSavedWordsFromTranslation] = useState<Set<string>>(new Set());
  const {
    lookupWord,
    currentEntry,
    currentWord,
    isLoading: isDictionaryLoading,
    reset: resetDictionary
  } = useDictionary();
  const {
    addWord,
    isWordInVocabulary,
    vocabulary
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
  // Only update if actively listening to avoid cursor issues during manual typing
  useEffect(() => {
    if (transcript && isListening) {
      setSourceText(transcript);
    }
  }, [transcript, isListening]);

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

  // Handle history consent response
  const handleHistoryConsent = useCallback(async (agreed: boolean) => {
    if (!user) {
      setShowHistoryConsent(false);
      return;
    }
    
    try {
      const { error } = await supabase.from("learning_settings").upsert({
        user_id: user.id,
        save_translation_history: agreed,
      }, { onConflict: 'user_id' });
      
      if (!error) {
        setSaveHistoryEnabled(agreed);
        if (agreed) {
          toast.success(t("historyConsentAccepted") || "번역 기록이 저장됩니다");
        }
      }
    } catch (error) {
      console.error("Failed to save consent:", error);
    }
    
    setShowHistoryConsent(false);
  }, [user, t]);

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

  // Save translation to DB or localStorage (only called after stable state)
  // Respects user's save_translation_history setting (default OFF for privacy)
  const saveTranslation = useCallback(async (translation: Translation) => {
    // Skip if already saved same text
    if (lastSavedTextRef.current === translation.source_text) {
      return;
    }
    
    if (user) {
      // Only save to database if user has enabled save_translation_history
      if (!saveHistoryEnabled) {
        // User has not enabled history saving - skip DB save silently
        lastSavedTextRef.current = translation.source_text;
        return;
      }
      
      // Save to database
      try {
        const { error } = await supabase.from("translations").insert({
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
        lastSavedTextRef.current = translation.source_text;
        await loadTranslations();
      } catch (error) {
        console.error("Failed to save translation:", error);
        // Silent fail - no toast for privacy-first approach
      }
    } else {
      // Guest users: save to localStorage only
      const stored = localStorage.getItem('translations');
      const translations = stored ? JSON.parse(stored) : [];

      // Remove duplicates with same source text and language pair
      const filtered = translations.filter((t: Translation) => !(t.source_text === translation.source_text && t.source_lang === translation.source_lang && t.target_lang === translation.target_lang));
      filtered.unshift(translation);
      localStorage.setItem('translations', JSON.stringify(filtered));
      lastSavedTextRef.current = translation.source_text;
      loadTranslations();
    }
  }, [user, saveHistoryEnabled, loadTranslations]);

  // Track if user is still typing
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Schedule save after user stops typing completely (3 seconds of no activity)
  const scheduleSave = useCallback((translation: Translation) => {
    // Clear previous save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Don't save if user is still typing
    if (isTypingRef.current) {
      return;
    }
    
    // Store pending translation
    pendingTranslationRef.current = translation;
    
    // Schedule save after 3 seconds of stability (increased from 1 second)
    saveTimeoutRef.current = setTimeout(() => {
      // Double check user stopped typing before saving
      if (pendingTranslationRef.current && !isTypingRef.current) {
        saveTranslation(pendingTranslationRef.current);
        pendingTranslationRef.current = null;
      }
    }, 3000);
  }, [saveTranslation]);

  // Save pending translation when user leaves or changes context
  const flushPendingTranslation = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (pendingTranslationRef.current) {
      saveTranslation(pendingTranslationRef.current);
      pendingTranslationRef.current = null;
    }
  }, [saveTranslation]);

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
    // Flush pending translation before language swap
    flushPendingTranslation();
    
    const newSource = targetLang;
    const newTarget = sourceLang;
    setSourceLang(newSource);
    setTargetLang(newTarget);
    setTargetText("");
    updateLanguagePair(newSource, newTarget);
  }, [sourceLang, targetLang, updateLanguagePair, flushPendingTranslation]);
  // Track current translation request to avoid race conditions
  const currentTranslationIdRef = useRef<number>(0);
  
  const handleTranslate = useCallback(async (retryCount = 0) => {
    if (!sourceText.trim()) {
      return;
    }

    // Generate unique ID for this translation request
    const translationId = Date.now();
    currentTranslationIdRef.current = translationId;

    // Cancel previous request if exists
    if (abortController) {
      abortController.abort();
    }

    // Try quick translation first (no AI, instant)
    if (shouldUseQuickTranslation(sourceText)) {
      const quickResult = attemptQuickTranslation(sourceText, sourceLang, targetLang);
      if (quickResult) {
        // Check if this is still the current request
        if (currentTranslationIdRef.current !== translationId) return;
        
        setTargetText(quickResult.translation);
        setLiteralTranslation(quickResult.literal || "");
        setSourceRomanization(quickResult.sourceRom || "");
        setTargetRomanization(quickResult.targetRom || "");
        setExampleSentence("");
        setHasTranslated(true);
        
        // Save to session state for persistence
        sessionStorage.setItem('translationSessionState', JSON.stringify({
          sourceText,
          targetText: quickResult.translation,
          literalTranslation: quickResult.literal || "",
          sourceRomanization: quickResult.sourceRom || "",
          targetRomanization: quickResult.targetRom || "",
          sourceLang,
          targetLang,
          timestamp: Date.now()
        }));

        // Schedule save (will save after user stops typing)
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
        scheduleSave(newTranslation);
        return; // Important: return here to prevent AI translation
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
          // Check if this is still the current request
          if (currentTranslationIdRef.current !== translationId) return;
          
          setTargetText(translation);
          setLiteralTranslation(literal);
          setSourceRomanization(srcRom);
          setTargetRomanization(tgtRom);
          setExampleSentence(example || "");
          setHasTranslated(true);
          
          // Save to session state for persistence
          sessionStorage.setItem('translationSessionState', JSON.stringify({
            sourceText,
            targetText: translation,
            literalTranslation: literal,
            sourceRomanization: srcRom,
            targetRomanization: tgtRom,
            sourceLang,
            targetLang,
            timestamp: Date.now()
          }));
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

    try {
      let translation = "";
      let literal = "";
      let srcRomanization = "";
      let tgtRomanization = "";
      let example = "";

      // Check if text should be chunked for parallel processing
      if (shouldChunkText(sourceText)) {
        const chunks = splitIntoChunks(sourceText);
        
        // Parallel translation of chunks with timeout
        const chunkPromises = chunks.map((chunk, index) => 
          Promise.race([
            supabase.functions.invoke("translate", {
              body: {
                text: chunk,
                sourceLang,
                targetLang,
                style: translationStyle
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Chunk timeout')), 10000)
            )
          ]).then(result => ({ index, result }))
        );

        const results = await Promise.all(chunkPromises);
        
        // Combine results in order with length validation
        const translatedChunks: string[] = [];
        const literalChunks: string[] = [];
        const minExpectedRatio = 0.15; // Translation should be at least 15% of source length
        
        for (const { index, result } of results.sort((a, b) => a.index - b.index)) {
          const data = (result as any).data;
          const chunkSource = chunks[index];
          const rawTranslation = data?.translation || "";
          
          if (rawTranslation) {
            // Validate chunk translation length
            const sourceLen = chunkSource.length;
            const translationLen = rawTranslation.length;
            const isChunkSuspiciouslyShort = 
              sourceLen > 5 && 
              translationLen > 0 &&
              translationLen < sourceLen * minExpectedRatio;
            
            if (isChunkSuspiciouslyShort && data.literalTranslation) {
              // Use literal translation if natural seems truncated
              console.warn(`Chunk ${index} translation too short (${translationLen} vs ${sourceLen}), using literal`);
              translatedChunks.push(data.literalTranslation);
            } else if (isChunkSuspiciouslyShort && translationLen < 10) {
              console.warn(`Chunk ${index} translation incomplete: "${rawTranslation}"`);
              // Skip this chunk or use literal if available
              if (data.literalTranslation) {
                translatedChunks.push(data.literalTranslation);
              }
            } else {
              translatedChunks.push(rawTranslation);
            }
            
            if (data.literalTranslation) literalChunks.push(data.literalTranslation);
          }
        }

        translation = combineChunks(translatedChunks);
        literal = literalChunks.length > 0 ? combineChunks(literalChunks) : "";
        
        // Use first chunk's romanization and example
        const firstData = (results[0]?.result as any)?.data;
        srcRomanization = firstData?.sourceRomanization || "";
        tgtRomanization = firstData?.targetRomanization || "";
        example = firstData?.exampleSentence || "";
      } else {
        // Single request for short text with timeout
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const { data, error } = await supabase.functions.invoke("translate", {
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
        
        // Validate translation length - if suspiciously short, use literal instead or retry
        const rawTranslation = data.translation || "";
        const minExpectedRatio = 0.15; // Translation should be at least 15% of source length
        const sourceLen = sourceText.length;
        const translationLen = rawTranslation.length;
        
        // Check if translation seems incomplete (too short relative to source)
        const isTranslationSuspiciouslyShort = 
          sourceLen > 5 && // Only check for non-trivial inputs
          translationLen > 0 &&
          translationLen < sourceLen * minExpectedRatio;
        
        if (isTranslationSuspiciouslyShort && data.literalTranslation) {
          // Use literal translation if natural translation seems truncated
          console.warn(`Translation suspiciously short (${translationLen} vs source ${sourceLen}), using literal`);
          translation = data.literalTranslation;
        } else if (isTranslationSuspiciouslyShort && translationLen < 10) {
          // If extremely short and no fallback, throw to trigger retry or error
          console.warn(`Translation too short: "${rawTranslation}" for source: "${sourceText}"`);
          throw new Error('번역 결과가 불완전합니다. 다시 시도해주세요.');
        } else {
          translation = rawTranslation;
        }
        
        literal = data.literalTranslation || "";
        srcRomanization = data.sourceRomanization || "";
        tgtRomanization = data.targetRomanization || "";
        example = data.exampleSentence || "";
      }

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
      
      // Check if this is still the current request before updating state
      if (currentTranslationIdRef.current !== translationId) return;
      
      setTargetText(translation);
      setLiteralTranslation(literal);
      setSourceRomanization(srcRomanization);
      setTargetRomanization(tgtRomanization);
      setExampleSentence(example);
      setHasTranslated(true);
      
      // Save to session state for persistence across refresh/background
      sessionStorage.setItem('translationSessionState', JSON.stringify({
        sourceText,
        targetText: translation,
        literalTranslation: literal,
        sourceRomanization: srcRomanization,
        targetRomanization: tgtRomanization,
        sourceLang,
        targetLang,
        timestamp: Date.now()
      }));

      // Schedule save (will save after user stops typing)
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
      scheduleSave(newTranslation);
    } catch (error: any) {
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
  }, [sourceText, sourceLang, targetLang, translationStyle, abortController, isOnline, t, scheduleSave]);

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
        // Flush pending translation before language change
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        if (pendingTranslationRef.current) {
          // Immediate save for pending translation
          const translation = pendingTranslationRef.current;
          const stored = localStorage.getItem('translations');
          const translations = stored ? JSON.parse(stored) : [];
          const filtered = translations.filter((t: Translation) => 
            !(t.source_text === translation.source_text && 
              t.source_lang === translation.source_lang && 
              t.target_lang === translation.target_lang));
          if (lastSavedTextRef.current !== translation.source_text) {
            filtered.unshift(translation);
            localStorage.setItem('translations', JSON.stringify(filtered));
            lastSavedTextRef.current = translation.source_text;
          }
          pendingTranslationRef.current = null;
        }
        
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

  // Track previous language values to detect language changes
  const prevSourceLangRef = useRef(sourceLang);
  const prevTargetLangRef = useRef(targetLang);
  const prevSourceTextRef = useRef(sourceText);

  // Track typing state to prevent saving incomplete input
  useEffect(() => {
    if (sourceText.trim()) {
      isTypingRef.current = true;
      
      // Clear previous save timeout when typing
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      pendingTranslationRef.current = null;
      
      // Clear previous typing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Mark as not typing after 3 seconds of no changes
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
      }, 3000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [sourceText]);

  // Auto-translate with debounce (optimized for speed)
  useEffect(() => {
    // When text is cleared, reset to new translation state
    if (!sourceText.trim()) {
      setTargetText("");
      setLiteralTranslation("");
      setSourceRomanization("");
      setTargetRomanization("");
      setHasTranslated(false);
      // Clear session state when text is emptied
      sessionStorage.removeItem('translationSessionState');
      return;
    }
    
    if (sourceText.trim().length < 2) {
      return;
    }

    // Check if language changed - if so, clear previous result immediately and translate faster
    const languageChanged = prevSourceLangRef.current !== sourceLang || prevTargetLangRef.current !== targetLang;
    const textChanged = prevSourceTextRef.current !== sourceText;
    
    prevSourceLangRef.current = sourceLang;
    prevTargetLangRef.current = targetLang;
    prevSourceTextRef.current = sourceText;

    if (languageChanged) {
      // Cancel any ongoing request immediately when language changes
      if (abortController) {
        abortController.abort();
        setAbortController(null);
      }
      // Clear previous timeout
      if (translateTimeoutRef.current) {
        clearTimeout(translateTimeoutRef.current);
      }
      // Clear pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      pendingTranslationRef.current = null;
      // Clear previous translation immediately when language changes
      setTargetText("");
      setLiteralTranslation("");
      setTargetRomanization("");
      setIsTranslating(false);
    }

    // Shorter delays for faster translation
    const delay = languageChanged ? 30 : (shouldUseQuickTranslation(sourceText) ? 80 : 250);
    
    translateTimeoutRef.current = setTimeout(() => {
      handleTranslate();
    }, delay);
    
    return () => {
      if (translateTimeoutRef.current) {
        clearTimeout(translateTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText, sourceLang, targetLang]);

  // Auth state listener, cache cleanup, and load user settings on mount
  useEffect(() => {
    // Clean expired caches on app start for better performance
    cleanAllCaches();
    
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      // Load user's save_translation_history setting and show consent if needed
      if (session?.user) {
        const { data: settings } = await supabase
          .from("learning_settings")
          .select("id, save_translation_history")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        // If no settings exist, show consent modal
        if (!settings) {
          setShowHistoryConsent(true);
          setSaveHistoryEnabled(false);
        } else {
          setSaveHistoryEnabled(settings.save_translation_history ?? false);
        }
      }
    };
    
    initAuth();
    
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      
      // Update save history setting when auth changes
      if (session?.user) {
        const { data: settings } = await supabase
          .from("learning_settings")
          .select("id, save_translation_history")
          .eq("user_id", session.user.id)
          .maybeSingle();
        
        // If no settings exist, show consent modal
        if (!settings) {
          setShowHistoryConsent(true);
          setSaveHistoryEnabled(false);
        } else {
          setSaveHistoryEnabled(settings.save_translation_history ?? false);
        }
      } else {
        setSaveHistoryEnabled(false);
      }
    });
    
    // Cleanup: save pending translation and clear timeouts on unmount
    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save any pending translation before unmount (only to localStorage for non-logged in users)
      if (pendingTranslationRef.current) {
        const translation = pendingTranslationRef.current;
        const stored = localStorage.getItem('translations');
        const translations = stored ? JSON.parse(stored) : [];
        const filtered = translations.filter((t: Translation) => 
          !(t.source_text === translation.source_text && 
            t.source_lang === translation.source_lang && 
            t.target_lang === translation.target_lang));
        filtered.unshift(translation);
        localStorage.setItem('translations', JSON.stringify(filtered));
      }
    };
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
      const MAX_FEEDBACK_TEXT_LEN = 5000;

      const sourceText = (translation.source_text ?? "").trim();
      const naturalTranslation = (translation.target_text ?? "").trim();
      const literalTranslation = translation.literal_translation?.trim() ?? null;

      if (
        sourceText.length > MAX_FEEDBACK_TEXT_LEN ||
        naturalTranslation.length > MAX_FEEDBACK_TEXT_LEN ||
        (literalTranslation !== null && literalTranslation.length > MAX_FEEDBACK_TEXT_LEN)
      ) {
        toast.error(t("feedbackTooLong", { max: MAX_FEEDBACK_TEXT_LEN }));
        return;
      }

      const { error } = await supabase.from("translation_feedback").insert({
        source_text: sourceText,
        natural_translation: naturalTranslation,
        literal_translation: literalTranslation,
        feedback_type: feedbackType,
        user_id: user?.id ?? null
      });

      if (error) throw error;

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
  // Save speech speed to localStorage
  useEffect(() => {
    localStorage.setItem('speechSpeed', speechSpeed.toString());
  }, [speechSpeed]);

  // Use OpenAI TTS for high-quality speech (especially for Asian languages)
  const speakWithOpenAI = useCallback(async (text: string, lang: string, speed: number): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, lang, speed }),
        }
      );

      if (!response.ok) {
        console.error('OpenAI TTS failed:', response.status);
        return false;
      }

      const data = await response.json();
      if (data.audioContent) {
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        const audio = new Audio(audioUrl);
        await audio.play();
        return true;
      }
      return false;
    } catch (error) {
      console.error('OpenAI TTS error:', error);
      return false;
    }
  }, []);

  // Fallback to browser Web Speech API
  const speakWithBrowser = useCallback((text: string, lang: string, speed: number) => {
    if (!('speechSynthesis' in window)) {
      toast.error(t('browserNotSupported') || '브라우저가 음성 재생을 지원하지 않습니다');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

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
    };
    utterance.lang = langMap[lang] || 'en-US';

    const voices = window.speechSynthesis.getVoices();
    const languageVoices = voices.filter(v => v.lang.startsWith(lang));
    const selectedVoice = languageVoices.find(v => v.name.includes('Google') && !v.localService)
      || languageVoices.find(v => !v.localService)
      || languageVoices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.rate = speed;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }, [t]);

  const handleSpeak = useCallback(async (text: string, lang: string, _romanization?: string) => {
    try {
      if (!text?.trim()) return;

      // Always use original text (not romanization) for proper pronunciation
      const textToSpeak = text.trim();

      // Languages that benefit most from OpenAI TTS (proper native pronunciation)
      const openAIPreferredLangs = ['ja', 'ko', 'zh', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru'];

      if (openAIPreferredLangs.includes(lang)) {
        const success = await speakWithOpenAI(textToSpeak, lang, speechSpeed);
        if (success) return;
      }

      // Fallback to browser TTS
      speakWithBrowser(textToSpeak, lang, speechSpeed);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast.error(t('translation.speakError') || '음성 재생에 실패했습니다');
    }
  }, [speakWithOpenAI, speakWithBrowser, speechSpeed, t]);
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

  // Handle saving word from translation result with one tap
  const handleWordSaveFromTranslation = useCallback(async (word: string) => {
    if (!word.trim() || savedWordsFromTranslation.has(word)) return;
    
    // Create definition with actual source text as the translation/meaning
    // The tapped word is from targetText (translated), so sourceText is its meaning
    const definition = {
      pos: "번역",
      definitions: [sourceText],
      meanings: [{
        partOfSpeech: "번역",
        definition: sourceText
      }],
      romanization: sourceRomanization || undefined,
      example: targetText
    };
    
    const success = await addWord(word, targetLang, definition as any);
    if (success) {
      setSavedWordsFromTranslation(prev => new Set(prev).add(word));
    }
  }, [addWord, targetLang, targetText, sourceText, sourceRomanization, savedWordsFromTranslation]);

  // Reset saved words when translation changes
  useEffect(() => {
    if (targetText) {
      setSavedWordsFromTranslation(new Set());
    }
  }, [sourceText]);
  return <SidebarProvider defaultOpen={false}>
      <div className="h-screen w-full bg-background overflow-hidden flex">
        <AppSidebar recentTranslations={recentTranslations} selectedIds={selectedIds} showLiteral={showLiteral} onToggleSelect={toggleSelect} onToggleLiteral={toggleLiteral} onToggleFavorite={toggleFavorite} onDelete={handleDelete} onBulkDelete={handleBulkDelete} onCopy={handleCopy} onSpeak={handleSpeak} onTextSelect={handleTextSelection} onFeedback={handleFeedback} noRomanizationLangs={noRomanizationLangs} />

        <div className="h-full flex-1 flex flex-col overflow-hidden">
          <header className="border-b border-border/50 bg-background sticky top-0 z-10 pt-safe">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="h-9 w-9" />
                </div>
                <HamburgerMenu user={user} onUserChange={setUser} />
              </div>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center px-4 py-6 pb-20 md:pb-6 overflow-y-auto">
            <div className="w-full max-w-3xl flex flex-col gap-4">
              {!isOnline && <Alert className="bg-warning/10 border-warning/30">
                  <WifiOff className="h-4 w-4 text-warning" />
                  <AlertDescription className="text-warning text-sm">
                    {t("offlineMode") || "오프라인 모드"}
                  </AlertDescription>
                </Alert>}

              <Tabs defaultValue="text" className="w-full">
                <TabsList className="grid w-full max-w-xs mx-auto grid-cols-2 h-9 mb-6">
                  <TabsTrigger value="text" className="text-sm">{t("textTranslation") || "텍스트"}</TabsTrigger>
                  <TabsTrigger value="image" className="text-sm">{t("imageTranslation") || "이미지"}</TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="space-y-4">
                  {/* Language selector row */}
                  <div className="flex items-center justify-center gap-3">
                    <LanguageSelector value={sourceLang} onChange={newLang => {
                    setSourceLang(newLang as any);
                    updateLanguagePair(newLang, targetLang);
                  }} />
                    
                    <Button variant="ghost" size="icon" onClick={swapLanguages} className="h-8 w-8 rounded-full hover:bg-muted shrink-0">
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                    
                    <LanguageSelector value={targetLang} onChange={newLang => {
                    setTargetLang(newLang as any);
                    updateLanguagePair(sourceLang, newLang);
                  }} />
                  </div>

                  {/* Translation style - minimal */}
                  {hasTranslated && (
                    <div className="flex justify-center">
                      <TranslationStyleSelector selectedStyle={translationStyle} onStyleChange={newStyle => {
                        setTranslationStyle(newStyle);
                        localStorage.setItem('translationStyle', JSON.stringify(newStyle));
                      }} />
                    </div>
                  )}
                  {/* Translation boxes */}
                  <div className={`flex flex-col md:grid md:grid-cols-2 ${
                    isMobile && !isInputFocused && !targetText && !isTranslating 
                      ? 'gap-0' 
                      : 'gap-4'
                  }`}>
                    {/* Source input - expanded on mobile when no translation result */}
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${
                      isMobile && !isInputFocused && !targetText && !isTranslating
                        ? '' 
                        : 'md:border md:border-border/50 md:rounded-lg'
                    }`}>
                      <TranslationBox 
                        value={sourceText} 
                        onChange={setSourceText} 
                        onCopy={() => handleCopy(sourceText)} 
                        onSpeak={() => handleSpeak(sourceText, sourceLang, sourceRomanization)} 
                        placeholder={t("enterText")} 
                        isEditable 
                        onMicClick={handleMicClick} 
                        isListening={isListening} 
                        audioLevel={audioLevel}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => {
                          // Only collapse if no text and no result
                          if (!sourceText.trim() && !targetText) {
                            setIsInputFocused(false);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey && sourceText.trim()) {
                            e.preventDefault();
                            setHasTranslated(true);
                            handleTranslate();
                          }
                        }}
                        isMobileExpanded={isMobile && !isInputFocused && !targetText && !isTranslating}
                        isMobileFocused={isMobile && (isInputFocused || !!targetText || isTranslating)}
                      />
                    </div>
                    
                    {/* Result - Mobile: animated expand/collapse, Desktop: always visible */}
                    <div 
                      className={`
                        md:block md:border md:border-border/50 md:rounded-lg
                        ${!isMobile ? '' : 
                          (isInputFocused || sourceText.trim()) && (targetText || isTranslating) 
                            ? 'mobile-result-enter border-t-2 border-border' 
                            : !sourceText.trim() && !targetText && !isInputFocused
                              ? 'mobile-result-hidden' 
                              : !sourceText.trim() && !isInputFocused
                                ? 'mobile-result-exit' 
                                : 'mobile-result-hidden'
                        }
                      `}
                    >
                      <TranslationResultBox 
                        naturalTranslation={targetText} 
                        literalTranslation={literalTranslation} 
                        romanization={!noRomanizationLangs.includes(targetLang) ? targetRomanization : undefined} 
                        onCopy={() => handleCopy(targetText)} 
                        onSpeak={() => handleSpeak(targetText, targetLang, targetRomanization)} 
                        onFeedback={type => {
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
                        isTranslating={isTranslating} 
                        placeholder={t("translationResult") || "번역 결과"}
                        speechSpeed={speechSpeed}
                        onSpeedChange={setSpeechSpeed}
                        onWordSave={user ? handleWordSaveFromTranslation : undefined}
                        savedWords={savedWordsFromTranslation}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="image">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <LanguageSelector value={sourceLang} onChange={newLang => setSourceLang(newLang as any)} />
                    
                    <Button variant="ghost" size="icon" onClick={swapLanguages} className="h-8 w-8 rounded-full hover:bg-muted shrink-0">
                      <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                    
                    <LanguageSelector value={targetLang} onChange={newLang => setTargetLang(newLang as any)} />
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

          <TranslationHistoryConsent
            open={showHistoryConsent}
            onConsent={handleHistoryConsent}
          />
        </div>
      </div>
    </SidebarProvider>;
};