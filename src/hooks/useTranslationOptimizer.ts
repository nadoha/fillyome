// Translation optimization hook with request deduplication, caching, and streaming support
import { useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationCache {
  /**
   * Used to invalidate old caches when response shape/semantics change.
   */
  schemaVersion: number;
  translation: string;
  literal: string;
  srcRom: string;
  tgtRom: string;
  litRom: string;
  example: string;
  timestamp: number;
  // Context cards for Usage Layout
  alternatives?: Array<{ text: string; tags: string[]; note?: string }>;
  usageCards?: Array<{ type: "situation" | "tone" | "recommend" | "caution"; title: string; items?: string[]; text?: string }>;
  usageExample?: { source: string; target: string } | null;
}

interface PendingRequest {
  promise: Promise<TranslationCache | null>;
  controller: AbortController;
}

// Global request queue for deduplication
const requestQueue = new Map<string, PendingRequest>();

// Cache TTL: 7 days
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE_SIZE = 100;

// Bump this to invalidate older cached romanization/translation mappings
// Version 3: Added context cards (alternatives, usageCards, usageExample)
const CACHE_SCHEMA_VERSION = 3;

export interface TranslationStyle {
  formality: "formal" | "informal";
  domain: "casual" | "business" | "academic";
  translationType: "literal" | "natural";
}

export interface StreamingTranslationResult {
  translation: string;
  literal: string;
  srcRom: string;
  tgtRom: string;
  example: string;
  isComplete: boolean;
  isStreaming: boolean;
}

// Generate cache key based on language pair and style
export const generateCacheKey = (
  text: string,
  sourceLang: string,
  targetLang: string,
  style: TranslationStyle
): string => {
  const styleKey = `${style.formality}_${style.domain}_${style.translationType}`;
  return `tr_${sourceLang}_${targetLang}_${styleKey}_${text.substring(0, 100)}`;
};

// Get from cache with TTL check
export const getFromCache = (cacheKey: string): TranslationCache | null => {
  try {
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const raw = JSON.parse(cached) as any;
    const normalized: TranslationCache = {
      schemaVersion: raw?.schemaVersion ?? 0,
      translation: raw?.translation ?? "",
      literal: raw?.literal ?? "",
      srcRom: raw?.srcRom ?? "",
      tgtRom: raw?.tgtRom ?? "",
      litRom: raw?.litRom ?? "",
      example: raw?.example ?? "",
      timestamp: raw?.timestamp ?? 0,
      // Context cards for Usage Layout
      alternatives: raw?.alternatives ?? [],
      usageCards: raw?.usageCards ?? [],
      usageExample: raw?.usageExample ?? null,
    };

    // Invalidate caches created before we fixed romanization field mapping
    if (normalized.schemaVersion !== CACHE_SCHEMA_VERSION) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    if (Date.now() - normalized.timestamp > CACHE_TTL) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return normalized;
  } catch {
    return null;
  }
};

// Save to cache with size management
export const saveToCache = (
  cacheKey: string,
  data: Omit<TranslationCache, 'timestamp' | 'schemaVersion'>
): void => {
  try {
    const cacheData: TranslationCache = {
      ...data,
      schemaVersion: CACHE_SCHEMA_VERSION,
      timestamp: Date.now(),
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));

    // Clean old entries periodically
    cleanCacheIfNeeded();
  } catch {
    // Cache full or error, continue silently
  }
};

// Clean cache entries if over limit
const cleanCacheIfNeeded = (): void => {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('tr_'));
  if (keys.length <= MAX_CACHE_SIZE) return;
  
  const now = Date.now();
  const keysWithTime = keys.map(k => {
    try {
      const data = JSON.parse(localStorage.getItem(k) || '{}');
      return { key: k, time: data.timestamp || 0 };
    } catch {
      return { key: k, time: 0 };
    }
  });
  
  // Remove expired first
  keysWithTime.forEach(({ key, time }) => {
    if (now - time > CACHE_TTL) {
      localStorage.removeItem(key);
    }
  });
  
  // If still over limit, remove oldest
  const remainingKeys = keysWithTime
    .filter(({ key }) => localStorage.getItem(key) !== null)
    .sort((a, b) => a.time - b.time);
  
  if (remainingKeys.length > MAX_CACHE_SIZE) {
    remainingKeys.slice(0, remainingKeys.length - MAX_CACHE_SIZE).forEach(({ key }) => {
      localStorage.removeItem(key);
    });
  }
};

// Cancel all pending requests for a prefix
export const cancelPendingRequests = (textPrefix?: string): void => {
  if (textPrefix) {
    for (const [key, pending] of requestQueue.entries()) {
      if (key.includes(textPrefix)) {
        pending.controller.abort();
        requestQueue.delete(key);
      }
    }
  } else {
    for (const pending of requestQueue.values()) {
      pending.controller.abort();
    }
    requestQueue.clear();
  }
};

export const useTranslationOptimizer = () => {
  const [streamingResult, setStreamingResult] = useState<StreamingTranslationResult | null>(null);
  const currentRequestIdRef = useRef<number>(0);
  
  // Deduplicated translation request
  const translateWithDeduplication = useCallback(async (
    text: string,
    sourceLang: string,
    targetLang: string,
    style: TranslationStyle,
    onStreamChunk?: (chunk: string) => void
  ): Promise<TranslationCache | null> => {
    const requestId = ++currentRequestIdRef.current;
    const cacheKey = generateCacheKey(text, sourceLang, targetLang, style);
    
    // Check cache first
    const cached = getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Check if same request is already pending
    const existingRequest = requestQueue.get(cacheKey);
    if (existingRequest) {
      return existingRequest.promise;
    }
    
    // Create new request
    const controller = new AbortController();
    
    const requestPromise = (async (): Promise<TranslationCache | null> => {
      try {
        // Set streaming state
        if (onStreamChunk) {
          setStreamingResult({
            translation: '',
            literal: '',
            srcRom: '',
            tgtRom: '',
            example: '',
            isComplete: false,
            isStreaming: true
          });
        }
        
        const { data, error } = await supabase.functions.invoke("translate", {
          body: {
            text,
            sourceLang,
            targetLang,
            style,
            stream: !!onStreamChunk
          }
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        
        // Check if still current request
        if (currentRequestIdRef.current !== requestId) {
          return null;
        }
        
        const result: TranslationCache = {
          translation: data.translation || '',
          literal: data.literalTranslation || '',
          srcRom: data.sourceRomanization || '',
          tgtRom: data.targetRomanization || '',
          litRom: data.literalRomanization || '',
          example: data.exampleSentence || '',
          timestamp: Date.now(),
          schemaVersion: CACHE_SCHEMA_VERSION
        };
        
        // Save to cache
        saveToCache(cacheKey, result);
        
        // Update streaming state
        if (onStreamChunk) {
          setStreamingResult({
            ...result,
            isComplete: true,
            isStreaming: false
          });
        }
        
        return result;
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return null;
        }
        throw error;
      } finally {
        requestQueue.delete(cacheKey);
      }
    })();
    
    requestQueue.set(cacheKey, { promise: requestPromise, controller });
    
    return requestPromise;
  }, []);
  
  // Batch translation for multiple sentences
  const batchTranslate = useCallback(async (
    texts: string[],
    sourceLang: string,
    targetLang: string,
    style: TranslationStyle
  ): Promise<(TranslationCache | null)[]> => {
    // Filter out cached results
    const uncachedTexts: { text: string; index: number }[] = [];
    const results: (TranslationCache | null)[] = new Array(texts.length).fill(null);
    
    texts.forEach((text, index) => {
      const cacheKey = generateCacheKey(text, sourceLang, targetLang, style);
      const cached = getFromCache(cacheKey);
      if (cached) {
        results[index] = cached;
      } else {
        uncachedTexts.push({ text, index });
      }
    });
    
    // If all cached, return immediately
    if (uncachedTexts.length === 0) {
      return results;
    }
    
    // Batch request for uncached texts
    try {
      const { data, error } = await supabase.functions.invoke("translate-batch", {
        body: {
          texts: uncachedTexts.map(t => t.text),
          sourceLang,
          targetLang,
          style
        }
      });
      
      if (!error && data?.translations) {
        data.translations.forEach((translation: any, i: number) => {
          const originalIndex = uncachedTexts[i].index;
          const result: TranslationCache = {
            translation: translation.translation || '',
            literal: translation.literalTranslation || '',
            srcRom: translation.sourceRomanization || '',
            tgtRom: translation.targetRomanization || '',
            litRom: translation.literalRomanization || '',
            example: translation.exampleSentence || '',
            timestamp: Date.now(),
            schemaVersion: CACHE_SCHEMA_VERSION
          };
          results[originalIndex] = result;
          
          // Cache individual results
          const cacheKey = generateCacheKey(uncachedTexts[i].text, sourceLang, targetLang, style);
          saveToCache(cacheKey, result);
        });
      }
    } catch (error) {
      console.error('Batch translation failed:', error);
      
      // Fallback to individual requests
      const fallbackPromises = uncachedTexts.map(async ({ text, index }) => {
        try {
          const result = await translateWithDeduplication(text, sourceLang, targetLang, style);
          results[index] = result;
        } catch {
          results[index] = null;
        }
      });
      await Promise.all(fallbackPromises);
    }
    
    return results;
  }, [translateWithDeduplication]);
  
  return {
    translateWithDeduplication,
    batchTranslate,
    cancelPendingRequests,
    streamingResult,
    getFromCache,
    generateCacheKey
  };
};
