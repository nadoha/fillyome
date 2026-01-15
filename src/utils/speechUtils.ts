/**
 * 브라우저 내장 Web Speech API 기반 TTS
 * Microsoft 음성을 우선적으로 사용 (고품질)
 */

const LANG_MAP: Record<string, string> = {
  ko: "ko-KR",
  ja: "ja-JP",
  en: "en-US",
  zh: "zh-CN",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
};

// 고품질 음성 우선순위 (Microsoft 음성 선호)
const PREFERRED_VOICES: Record<string, string[]> = {
  "ko-KR": ["Microsoft Heami", "Microsoft SunHi", "Google 한국어", "Yuna"],
  "ja-JP": ["Microsoft Nanami", "Microsoft Keita", "Google 日本語", "Kyoko"],
  "en-US": ["Microsoft Zira", "Microsoft David", "Google US English", "Samantha"],
  "zh-CN": ["Microsoft Xiaoxiao", "Microsoft Yunyang", "Google 普通话"],
};

let cachedVoices: SpeechSynthesisVoice[] = [];

const loadVoices = (): Promise<SpeechSynthesisVoice[]> => {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      cachedVoices = voices;
      resolve(voices);
      return;
    }

    speechSynthesis.onvoiceschanged = () => {
      cachedVoices = speechSynthesis.getVoices();
      resolve(cachedVoices);
    };

    // Timeout fallback
    setTimeout(() => {
      cachedVoices = speechSynthesis.getVoices();
      resolve(cachedVoices);
    }, 500);
  });
};

const getBestVoice = (langCode: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const preferredList = PREFERRED_VOICES[langCode] || [];
  
  // 1. 우선순위 음성 찾기 (Microsoft 음성 우선)
  for (const preferred of preferredList) {
    const found = voices.find(v => v.name.includes(preferred));
    if (found) return found;
  }

  // 2. 해당 언어의 Microsoft 음성 찾기
  const msVoice = voices.find(v => 
    v.lang.startsWith(langCode.split("-")[0]) && 
    v.name.toLowerCase().includes("microsoft")
  );
  if (msVoice) return msVoice;

  // 3. 해당 언어의 아무 음성
  const anyVoice = voices.find(v => v.lang.startsWith(langCode.split("-")[0]));
  if (anyVoice) return anyVoice;

  // 4. 기본 음성
  return voices[0] || null;
};

export const speakText = async (
  text: string, 
  lang: string, 
  options?: { rate?: number; pitch?: number; volume?: number }
): Promise<void> => {
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported");
    return;
  }

  // 현재 재생 중인 음성 취소
  speechSynthesis.cancel();

  const voices = cachedVoices.length > 0 ? cachedVoices : await loadVoices();
  const langCode = LANG_MAP[lang] || lang;
  
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = langCode;
  utterance.rate = options?.rate ?? 0.9;
  utterance.pitch = options?.pitch ?? 1;
  utterance.volume = options?.volume ?? 1;

  const bestVoice = getBestVoice(langCode, voices);
  if (bestVoice) {
    utterance.voice = bestVoice;
  }

  return new Promise((resolve, reject) => {
    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      console.error("Speech synthesis error:", e);
      reject(e);
    };
    speechSynthesis.speak(utterance);
  });
};

// 음성 목록 미리 로드
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
}
