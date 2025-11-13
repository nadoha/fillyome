import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ko from './locales/ko.json';
import ja from './locales/ja.json';
import en from './locales/en.json';
import zh from './locales/zh.json';

// Detect browser language and map to supported languages
const getBrowserLanguage = () => {
  const browserLang = navigator.language.toLowerCase();
  
  // Map browser language codes to supported languages
  if (browserLang.startsWith('ko')) return 'ko';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('zh')) return 'zh';
  if (browserLang.startsWith('en')) return 'en';
  
  // Default to Korean if no match
  return 'ko';
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      ja: { translation: ja },
      en: { translation: en },
      zh: { translation: zh },
    },
    fallbackLng: getBrowserLanguage(),
    supportedLngs: ['ko', 'ja', 'en', 'zh'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
    },
  });

export default i18n;
