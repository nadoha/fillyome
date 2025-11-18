// Cache management utilities for improved performance

const CACHE_PREFIXES = {
  TRANSLATION: 'tr_',
  DICTIONARY: 'dict_',
  VOCABULARY: 'vocab_',
} as const;

const CACHE_LIMITS = {
  TRANSLATION: 50,
  DICTIONARY: 30,
  VOCABULARY: 100,
} as const;

const CACHE_EXPIRY = {
  TRANSLATION: 7 * 24 * 60 * 60 * 1000, // 7 days
  DICTIONARY: 30 * 24 * 60 * 60 * 1000, // 30 days
  VOCABULARY: 365 * 24 * 60 * 60 * 1000, // 1 year
} as const;

interface CachedData {
  timestamp: number;
  [key: string]: any;
}

/**
 * Clean expired cache entries for a specific prefix
 */
export const cleanExpiredCache = (prefix: keyof typeof CACHE_PREFIXES) => {
  const prefixStr = CACHE_PREFIXES[prefix];
  const expiry = CACHE_EXPIRY[prefix];
  const now = Date.now();
  
  const keys = Object.keys(localStorage).filter(k => k.startsWith(prefixStr));
  
  keys.forEach(key => {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || '{}') as CachedData;
      if (!cached.timestamp || (now - cached.timestamp > expiry)) {
        localStorage.removeItem(key);
      }
    } catch {
      localStorage.removeItem(key);
    }
  });
};

/**
 * Enforce cache size limit for a specific prefix
 */
export const enforceCacheLimit = (prefix: keyof typeof CACHE_PREFIXES) => {
  const prefixStr = CACHE_PREFIXES[prefix];
  const limit = CACHE_LIMITS[prefix];
  
  const keys = Object.keys(localStorage).filter(k => k.startsWith(prefixStr));
  
  if (keys.length <= limit) return;
  
  // Sort by timestamp and remove oldest
  const keysWithTime = keys.map(k => {
    try {
      const cached = JSON.parse(localStorage.getItem(k) || '{}') as CachedData;
      return { key: k, time: cached.timestamp || 0 };
    } catch {
      return { key: k, time: 0 };
    }
  }).sort((a, b) => a.time - b.time);
  
  keysWithTime.slice(0, keysWithTime.length - limit).forEach(({ key }) => {
    localStorage.removeItem(key);
  });
};

/**
 * Clean all expired caches and enforce limits
 */
export const cleanAllCaches = () => {
  const prefixes: (keyof typeof CACHE_PREFIXES)[] = ['TRANSLATION', 'DICTIONARY', 'VOCABULARY'];
  
  prefixes.forEach(prefix => {
    cleanExpiredCache(prefix);
    enforceCacheLimit(prefix);
  });
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const stats = {
    translation: 0,
    dictionary: 0,
    vocabulary: 0,
    other: 0,
    total: 0,
  };
  
  Object.keys(localStorage).forEach(key => {
    stats.total++;
    if (key.startsWith(CACHE_PREFIXES.TRANSLATION)) stats.translation++;
    else if (key.startsWith(CACHE_PREFIXES.DICTIONARY)) stats.dictionary++;
    else if (key.startsWith(CACHE_PREFIXES.VOCABULARY)) stats.vocabulary++;
    else stats.other++;
  });
  
  return stats;
};

/**
 * Clear all translation caches (useful for troubleshooting)
 */
export const clearTranslationCache = () => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIXES.TRANSLATION));
  keys.forEach(k => localStorage.removeItem(k));
  return keys.length;
};
