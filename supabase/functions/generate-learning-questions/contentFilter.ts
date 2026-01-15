/**
 * Content Filter for Learning Questions
 * Filters out inappropriate, offensive, or harmful content from learning materials
 * 
 * Categories filtered:
 * - Sexual/explicit content
 * - Hate speech (race, nationality, gender, disability)
 * - Violence incitement
 * - Self-harm/suicide content
 */

// Korean blocked terms (partial list - can be extended)
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

// Japanese blocked terms (partial list - can be extended)
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

// Combined blocked terms for quick lookup
const BLOCKED_TERMS_SET_KO = new Set(BLOCKED_TERMS_KO.map(t => t.toLowerCase()));
const BLOCKED_TERMS_SET_JA = new Set(BLOCKED_TERMS_JA.map(t => t.toLowerCase()));

// Regex patterns for common variations (spacing, partial matches)
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

// Content categories for AI moderation
export type ContentCategory = "safe" | "adult" | "hate" | "violence" | "self_harm";

interface FilterResult {
  isBlocked: boolean;
  category?: ContentCategory;
  // Internal only - never expose to users
  matchedTerm?: string;
}

/**
 * Check if text contains blocked terms using dictionary lookup
 */
function checkBlockedTerms(text: string, lang: "ko" | "ja"): FilterResult {
  const normalizedText = text.toLowerCase().trim();
  const blockedSet = lang === "ko" ? BLOCKED_TERMS_SET_KO : BLOCKED_TERMS_SET_JA;
  const blockedTerms = lang === "ko" ? BLOCKED_TERMS_KO : BLOCKED_TERMS_JA;
  
  // Direct match check
  for (const term of blockedTerms) {
    if (normalizedText.includes(term.toLowerCase())) {
      console.log(`[ContentFilter] Blocked term detected (dictionary): ${lang}`);
      return { isBlocked: true, category: "adult", matchedTerm: term };
    }
  }
  
  return { isBlocked: false };
}

/**
 * Check if text matches blocked patterns (handles spacing/variations)
 */
function checkBlockedPatterns(text: string, lang: "ko" | "ja"): FilterResult {
  const patterns = lang === "ko" ? BLOCKED_PATTERNS_KO : BLOCKED_PATTERNS_JA;
  
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      console.log(`[ContentFilter] Blocked pattern detected: ${lang}`);
      return { isBlocked: true, category: "adult" };
    }
  }
  
  return { isBlocked: false };
}

/**
 * Detect language of text (simple heuristic)
 */
function detectLanguage(text: string): "ko" | "ja" | "unknown" {
  const koPattern = /[가-힣]/;
  const jaPattern = /[ぁ-んァ-ン一-龯]/;
  
  const koCount = (text.match(/[가-힣]/g) || []).length;
  const jaCount = (text.match(/[ぁ-んァ-ン一-龯]/g) || []).length;
  
  if (koCount > jaCount && koCount > 0) return "ko";
  if (jaCount > koCount && jaCount > 0) return "ja";
  return "unknown";
}

/**
 * Main content filter function
 * Checks text against blocked terms, patterns, and optionally AI moderation
 */
export function filterContent(text: string, lang?: "ko" | "ja"): FilterResult {
  if (!text || text.trim().length === 0) {
    return { isBlocked: false };
  }
  
  const detectedLang = lang || detectLanguage(text);
  
  // Check both languages if unknown
  const langsToCheck: ("ko" | "ja")[] = detectedLang === "unknown" ? ["ko", "ja"] : [detectedLang];
  
  for (const checkLang of langsToCheck) {
    // Step 1: Dictionary check
    const dictResult = checkBlockedTerms(text, checkLang);
    if (dictResult.isBlocked) {
      return dictResult;
    }
    
    // Step 2: Pattern check
    const patternResult = checkBlockedPatterns(text, checkLang);
    if (patternResult.isBlocked) {
      return patternResult;
    }
  }
  
  return { isBlocked: false };
}

/**
 * AI-based content moderation using Lovable AI
 * Only called for uncertain cases or as additional safety layer
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
 * Use this for critical filtering (question generation)
 */
export async function fullContentCheck(
  text: string,
  apiKey?: string,
  lang?: "ko" | "ja"
): Promise<FilterResult> {
  // Step 1: Fast dictionary/pattern check
  const quickResult = filterContent(text, lang);
  if (quickResult.isBlocked) {
    return quickResult;
  }
  
  // Step 2: AI moderation for additional safety (if API key available)
  if (apiKey && text.length > 2) {
    return await aiModerateContent(text, apiKey);
  }
  
  return { isBlocked: false };
}

/**
 * Filter an array of items, removing blocked content
 */
export function filterItems<T>(
  items: T[],
  getTexts: (item: T) => string[],
  lang?: "ko" | "ja"
): T[] {
  return items.filter(item => {
    const texts = getTexts(item);
    return !texts.some(text => filterContent(text, lang).isBlocked);
  });
}

/**
 * Async version of filterItems with AI moderation
 */
export async function filterItemsAsync<T>(
  items: T[],
  getTexts: (item: T) => string[],
  apiKey?: string,
  lang?: "ko" | "ja"
): Promise<T[]> {
  const filtered: T[] = [];
  
  for (const item of items) {
    const texts = getTexts(item);
    let isBlocked = false;
    
    for (const text of texts) {
      const result = await fullContentCheck(text, apiKey, lang);
      if (result.isBlocked) {
        isBlocked = true;
        break;
      }
    }
    
    if (!isBlocked) {
      filtered.push(item);
    }
  }
  
  return filtered;
}
