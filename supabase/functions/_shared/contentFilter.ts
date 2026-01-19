/**
 * Shared Content Filter for Edge Functions
 * Filters out inappropriate, offensive, or harmful content
 * 
 * Categories filtered:
 * - Sexual/explicit content
 * - Hate speech (race, nationality, gender, disability)
 * - Violence incitement
 * - Self-harm/suicide content
 */

// Korean blocked terms
const BLOCKED_TERMS_KO: string[] = [
  // Sexual/explicit terms
  "보지", "자지", "섹스", "야동", "포르노", "성기", "음경", "질", "유두", "사정",
  "오르가즘", "자위", "강간", "성폭행", "성추행", "몸파", "원조교제", "성매매",
  "매춘", "창녀", "딸딸이", "좆", "씹", "후장", "애액", "정액", "삽입",
  // Hate speech
  "쪽바리", "짱깨", "깜둥이", "장애인새끼", "병신", "찐따", "한남충", "한녀충",
  "된장녀", "김치녀", "맘충", "틀딱", "노인충",
  // Violence
  "죽여버릴", "찔러죽", "패죽", "불태워죽", "살해",
  // Self-harm
  "자살방법", "손목그", "목매달", "약물자살", "번개자살",
];

// Japanese blocked terms
const BLOCKED_TERMS_JA: string[] = [
  // Sexual/explicit terms
  "セックス", "ちんこ", "まんこ", "オナニー", "レイプ", "強姦", "性器", "陰茎", 
  "膣", "射精", "中出し", "潮吹き", "フェラ", "クンニ", "アナル", "風俗",
  "ソープ", "デリヘル", "援交", "売春", "痴漢", "盗撮",
  // Hate speech  
  "チョン", "シナ人", "ニガー", "ガイジ", "池沼", "メンヘラ", "キチガイ",
  "在日", "朝鮮人", "部落",
  // Violence
  "殺してやる", "刺し殺", "殴り殺",
  // Self-harm
  "自殺方法", "リスカ", "首吊り", "練炭自殺",
];

// English blocked terms
const BLOCKED_TERMS_EN: string[] = [
  // Explicit
  "fuck", "shit", "bitch", "asshole", "dick", "pussy", "cock", "cum", "porn",
  // Slurs
  "nigger", "nigga", "faggot", "retard", "chink", "spic", "wetback", "kike",
  // Violence
  "kill yourself", "kys",
];

// Chinese blocked terms
const BLOCKED_TERMS_ZH: string[] = [
  // Explicit
  "操", "肏", "鸡巴", "屄", "逼", "性交", "做爱", "自慰",
  // Slurs
  "支那", "黑鬼", "白皮猪",
  // Violence/self-harm
  "杀死", "自杀方法",
];

const BLOCKED_TERMS_SET_KO = new Set(BLOCKED_TERMS_KO.map(t => t.toLowerCase()));
const BLOCKED_TERMS_SET_JA = new Set(BLOCKED_TERMS_JA.map(t => t.toLowerCase()));
const BLOCKED_TERMS_SET_EN = new Set(BLOCKED_TERMS_EN.map(t => t.toLowerCase()));
const BLOCKED_TERMS_SET_ZH = new Set(BLOCKED_TERMS_ZH.map(t => t.toLowerCase()));

// Regex patterns for common variations
const BLOCKED_PATTERNS_KO: RegExp[] = [
  /보\s*지/gi,
  /자\s*지/gi,
  /섹\s*스/gi,
  /강\s*간/gi,
  /자\s*살\s*방\s*법/gi,
  /목\s*매/gi,
  /죽\s*여/gi,
  /병\s*신/gi,
];

const BLOCKED_PATTERNS_JA: RegExp[] = [
  /セ\s*ッ\s*ク\s*ス/gi,
  /ち\s*ん\s*こ/gi,
  /ま\s*ん\s*こ/gi,
  /オ\s*ナ\s*ニ\s*ー/gi,
  /レ\s*イ\s*プ/gi,
  /自\s*殺\s*方\s*法/gi,
  /キ\s*チ\s*ガ\s*イ/gi,
];

const BLOCKED_PATTERNS_EN: RegExp[] = [
  /f\s*u\s*c\s*k/gi,
  /n\s*i\s*g\s*g\s*e\s*r/gi,
  /k\s*i\s*l\s*l\s+y\s*o\s*u\s*r\s*s\s*e\s*l\s*f/gi,
];

export type ContentCategory = "safe" | "adult" | "hate" | "violence" | "self_harm";

interface FilterResult {
  isBlocked: boolean;
  category?: ContentCategory;
}

type SupportedLang = "ko" | "ja" | "en" | "zh";

function normalizeText(text: string): string {
  // Normalize Unicode to NFC form and lowercase
  return text.normalize("NFC").toLowerCase().trim();
}

function checkBlockedTerms(text: string, lang: SupportedLang): FilterResult {
  const normalizedText = normalizeText(text);
  
  const blockedSets: Record<SupportedLang, Set<string>> = {
    ko: BLOCKED_TERMS_SET_KO,
    ja: BLOCKED_TERMS_SET_JA,
    en: BLOCKED_TERMS_SET_EN,
    zh: BLOCKED_TERMS_SET_ZH,
  };
  
  const blockedTerms: Record<SupportedLang, string[]> = {
    ko: BLOCKED_TERMS_KO,
    ja: BLOCKED_TERMS_JA,
    en: BLOCKED_TERMS_EN,
    zh: BLOCKED_TERMS_ZH,
  };
  
  const terms = blockedTerms[lang] || [];
  
  for (const term of terms) {
    if (normalizedText.includes(term.toLowerCase())) {
      console.log(`[ContentFilter] Blocked term detected: ${lang}`);
      return { isBlocked: true, category: "adult" };
    }
  }
  
  return { isBlocked: false };
}

function checkBlockedPatterns(text: string, lang: SupportedLang): FilterResult {
  const patterns: Record<SupportedLang, RegExp[]> = {
    ko: BLOCKED_PATTERNS_KO,
    ja: BLOCKED_PATTERNS_JA,
    en: BLOCKED_PATTERNS_EN,
    zh: [],
  };
  
  const langPatterns = patterns[lang] || [];
  
  for (const pattern of langPatterns) {
    if (pattern.test(text)) {
      console.log(`[ContentFilter] Blocked pattern detected: ${lang}`);
      return { isBlocked: true, category: "adult" };
    }
  }
  
  return { isBlocked: false };
}

function detectLanguage(text: string): SupportedLang | "unknown" {
  const koPattern = /[가-힣]/;
  const jaPattern = /[ぁ-んァ-ン]/;
  const zhPattern = /[\u4e00-\u9fff]/;
  const enPattern = /[a-zA-Z]/;
  
  const koCount = (text.match(/[가-힣]/g) || []).length;
  const jaCount = (text.match(/[ぁ-んァ-ン]/g) || []).length;
  const zhCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const enCount = (text.match(/[a-zA-Z]/g) || []).length;
  
  const counts = [
    { lang: "ko" as SupportedLang, count: koCount },
    { lang: "ja" as SupportedLang, count: jaCount },
    { lang: "zh" as SupportedLang, count: zhCount },
    { lang: "en" as SupportedLang, count: enCount },
  ];
  
  const max = counts.reduce((a, b) => a.count > b.count ? a : b);
  if (max.count > 0) return max.lang;
  return "unknown";
}

/**
 * Main content filter function
 */
export function filterContent(text: string, lang?: string): FilterResult {
  if (!text || text.trim().length === 0) {
    return { isBlocked: false };
  }
  
  const detectedLang = lang ? (lang as SupportedLang) : detectLanguage(text);
  
  // Check all supported languages if unknown
  let langsToCheck: SupportedLang[];
  if (detectedLang === "unknown") {
    langsToCheck = ["ko", "ja", "en", "zh"];
  } else {
    langsToCheck = [detectedLang];
  }
  
  for (const checkLang of langsToCheck) {
    // Dictionary check
    const dictResult = checkBlockedTerms(text, checkLang);
    if (dictResult.isBlocked) {
      return dictResult;
    }
    
    // Pattern check
    const patternResult = checkBlockedPatterns(text, checkLang);
    if (patternResult.isBlocked) {
      return patternResult;
    }
  }
  
  return { isBlocked: false };
}

/**
 * AI-based content moderation using Lovable AI
 */
export async function aiModerateContent(
  text: string, 
  apiKey: string
): Promise<FilterResult> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: `Classify this text for content safety. Categories: safe, adult (sexual/explicit), hate (discrimination/slurs), violence (incitement), self_harm (suicide/self-injury).

Text: "${text}"

Respond with ONLY one word from the categories above.`
        }],
      }),
    });

    if (!response.ok) {
      console.error("[ContentFilter] AI moderation API error");
      return { isBlocked: false };
    }

    const data = await response.json();
    const category = data.choices[0]?.message?.content?.trim().toLowerCase() as ContentCategory;

    if (category && ["adult", "hate", "violence", "self_harm"].includes(category)) {
      console.log(`[ContentFilter] AI moderation blocked: ${category}`);
      return { isBlocked: true, category };
    }

    return { isBlocked: false };
  } catch (error) {
    console.error("[ContentFilter] AI moderation error:", error);
    return { isBlocked: false };
  }
}

/**
 * Full content check with both dictionary and AI moderation
 */
export async function fullContentCheck(
  text: string,
  apiKey?: string,
  lang?: string
): Promise<FilterResult> {
  // Fast dictionary/pattern check first
  const quickResult = filterContent(text, lang);
  if (quickResult.isBlocked) {
    return quickResult;
  }
  
  // AI moderation for additional safety (if API key available and text is substantial)
  if (apiKey && text.length > 5) {
    return await aiModerateContent(text, apiKey);
  }
  
  return { isBlocked: false };
}
