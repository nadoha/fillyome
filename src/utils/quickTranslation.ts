// Quick translation dictionary for common words and phrases
const quickDictionary: Record<string, Record<string, string>> = {
  // Korean to English (expanded dictionary for faster translations)
  "ko-en": {
    "안녕": "Hello",
    "안녕하세요": "Hello",
    "감사합니다": "Thank you",
    "고맙습니다": "Thank you",
    "고마워": "Thanks",
    "감사": "Thank you",
    "네": "Yes",
    "아니오": "No",
    "아니": "No",
    "예": "Yes",
    "좋아": "Good",
    "좋아요": "Good",
    "나쁘다": "Bad",
    "나빠요": "Bad",
    "사랑": "Love",
    "사랑해": "I love you",
    "미안": "Sorry",
    "미안해": "Sorry",
    "미안해요": "Sorry",
    "죄송합니다": "I'm sorry",
    "괜찮아": "It's okay",
    "괜찮아요": "It's okay",
    "물": "Water",
    "밥": "Rice",
    "음식": "Food",
    "집": "House",
    "학교": "School",
    "친구": "Friend",
    "가족": "Family",
    "시간": "Time",
    "오늘": "Today",
    "내일": "Tomorrow",
    "어제": "Yesterday",
    "뭐해": "What are you doing",
    "잘자": "Good night",
    "잘자요": "Good night",
    "잘 지내": "How are you",
    "어디": "Where",
    "언제": "When",
    "왜": "Why",
    "누구": "Who",
    "뭐": "What",
    "어떻게": "How",
    "맞아": "Right",
    "틀려": "Wrong",
  },
  // English to Korean
  "en-ko": {
    "hello": "안녕하세요",
    "hi": "안녕",
    "thank you": "감사합니다",
    "thanks": "고마워요",
    "yes": "네",
    "no": "아니요",
    "good": "좋아요",
    "bad": "나빠요",
    "love": "사랑",
    "sorry": "미안해요",
    "okay": "괜찮아요",
    "water": "물",
    "food": "음식",
    "house": "집",
    "school": "학교",
    "friend": "친구",
    "family": "가족",
    "time": "시간",
    "today": "오늘",
    "tomorrow": "내일",
    "yesterday": "어제",
  },
  // Korean to Japanese
  "ko-ja": {
    "안녕": "こんにちは",
    "안녕하세요": "こんにちは",
    "감사합니다": "ありがとうございます",
    "고맙습니다": "ありがとう",
    "네": "はい",
    "아니오": "いいえ",
    "좋아": "いいね",
    "미안": "ごめん",
    "사랑": "愛",
    "물": "水",
    "밥": "ご飯",
    "집": "家",
    "학교": "学校",
    "친구": "友達",
    "가족": "家族",
    "오늘": "今日",
    "내일": "明日",
    "어제": "昨日",
  },
  // Japanese to Korean
  "ja-ko": {
    "こんにちは": "안녕하세요",
    "ありがとう": "고마워요",
    "ありがとうございます": "감사합니다",
    "はい": "네",
    "いいえ": "아니요",
    "ごめん": "미안해",
    "すみません": "죄송합니다",
    "愛": "사랑",
    "水": "물",
    "家": "집",
    "学校": "학교",
    "友達": "친구",
    "家族": "가족",
    "今日": "오늘",
    "明日": "내일",
    "昨日": "어제",
  },
};

interface QuickTranslationResult {
  translation: string;
  isQuick: boolean;
  literal?: string;
  sourceRom?: string;
  targetRom?: string;
}

export const attemptQuickTranslation = (
  text: string,
  sourceLang: string,
  targetLang: string
): QuickTranslationResult | null => {
  const trimmedText = text.trim();
  const lowerText = trimmedText.toLowerCase();
  
  // Check if text is simple enough for quick translation
  const isSimple = 
    trimmedText.length <= 50 && // Max 50 characters
    trimmedText.split(/\s+/).length <= 5 && // Max 5 words
    !trimmedText.includes('?') && // No complex punctuation
    !trimmedText.includes('!') &&
    !/[.]{2,}/.test(trimmedText); // No ellipsis

  if (!isSimple) {
    return null;
  }

  const dictKey = `${sourceLang}-${targetLang}`;
  const dict = quickDictionary[dictKey];

  if (!dict) {
    return null;
  }

  // Try exact match (case-insensitive for some languages)
  const exactMatch = dict[trimmedText] || dict[lowerText];
  if (exactMatch) {
    return {
      translation: exactMatch,
      isQuick: true,
      literal: exactMatch,
    };
  }

  // Try word-by-word for short phrases
  const words = trimmedText.split(/\s+/);
  if (words.length <= 3) {
    const translations = words.map(word => {
      const wordLower = word.toLowerCase();
      return dict[word] || dict[wordLower] || null;
    });

    // If all words found, return combined translation
    if (translations.every(t => t !== null)) {
      return {
        translation: translations.join(' '),
        isQuick: true,
        literal: translations.join(' '),
      };
    }
  }

  return null;
};

export const shouldUseQuickTranslation = (text: string): boolean => {
  const trimmed = text.trim();
  
  // Extended quick translation threshold for better performance
  // Uses dictionary lookup for text up to 100 characters or 8 words
  return (
    trimmed.length > 0 &&
    trimmed.length <= 100 &&
    trimmed.split(/\s+/).length <= 8 &&
    // Avoid complex punctuation that needs context
    !trimmed.includes('?') &&
    !trimmed.includes('!') &&
    !/[.]{2,}/.test(trimmed)
  );
};

// Check if text is likely a single word or simple phrase that's cacheable
export const isSimpleCacheableText = (text: string): boolean => {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= 200 && trimmed.split(/\s+/).length <= 15;
};
