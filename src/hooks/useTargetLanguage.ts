import { useTranslation } from "react-i18next";

/**
 * Hook to get the learning target language based on the user's UI language.
 * 
 * Rules:
 * - Korean UI → Japanese as learning target
 * - Japanese UI → Korean as learning target
 * - Other UI languages → Japanese as learning target (default)
 * 
 * This ensures a bidirectional learning experience:
 * Korean speakers learn Japanese, Japanese speakers learn Korean.
 */
export const useTargetLanguage = () => {
  const { i18n } = useTranslation();
  
  const currentLang = i18n.language;
  
  // Determine learning target language based on UI language
  const getTargetLanguage = (): "ja" | "ko" => {
    if (currentLang === "ja") return "ko";
    return "ja"; // Default: Korean users (and others) learn Japanese
  };
  
  // Determine source language (user's native language)
  const getSourceLanguage = (): "ko" | "ja" => {
    if (currentLang === "ja") return "ja";
    return "ko"; // Default: Korean
  };
  
  const targetLanguage = getTargetLanguage();
  const sourceLanguage = getSourceLanguage();
  
  // Language display names in the user's current UI language
  const targetLanguageName = currentLang === "ja" ? "韓国語" : "일본어";
  const sourceLanguageName = currentLang === "ja" ? "日本語" : "한국어";
  
  return {
    /** The language the user is learning (ja or ko) */
    targetLanguage,
    /** The user's native/UI language (ko or ja) */
    sourceLanguage,
    /** Display name of target language */
    targetLanguageName,
    /** Display name of source language */
    sourceLanguageName,
    /** Whether the user is a Japanese speaker learning Korean */
    isJapaneseUser: currentLang === "ja",
    /** Whether the user is a Korean speaker learning Japanese */
    isKoreanUser: currentLang !== "ja",
  };
};
