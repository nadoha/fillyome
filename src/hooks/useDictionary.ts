import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DictionaryEntry {
  pos: string;
  definitions: string[];
  romanization?: string;
  example: string;
}

interface CachedEntry {
  word: string;
  lang: string;
  entry: DictionaryEntry;
  timestamp: number;
}

const CACHE_KEY = "dictionary_cache";
const MAX_CACHE_SIZE = 50;
const CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export const useDictionary = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<DictionaryEntry | null>(null);
  const [currentWord, setCurrentWord] = useState("");

  const getCache = useCallback((): CachedEntry[] => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return [];
      const entries: CachedEntry[] = JSON.parse(cached);
      // Filter out expired entries
      const now = Date.now();
      return entries.filter(e => now - e.timestamp < CACHE_EXPIRY);
    } catch {
      return [];
    }
  }, []);

  const setCache = useCallback((entries: CachedEntry[]) => {
    try {
      // Keep only last 50 entries
      const trimmed = entries.slice(0, MAX_CACHE_SIZE);
      localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
    } catch (error) {
      console.error("Failed to cache dictionary entry:", error);
    }
  }, []);

  const lookupWord = useCallback(async (word: string, lang: string, context?: string) => {
    setCurrentWord(word);
    setIsLoading(true);
    setCurrentEntry(null);

    try {
      // Check cache first
      const cache = getCache();
      const cached = cache.find(e => e.word === word && e.lang === lang);
      
      if (cached) {
        setCurrentEntry(cached.entry);
        setIsLoading(false);
        return cached.entry;
      }

      // Fetch from API
      const { data, error } = await supabase.functions.invoke("dictionary", {
        body: { word, lang, context },
      });

      if (error) throw error;

      setCurrentEntry(data);

      // Update cache
      const newCache: CachedEntry[] = [
        { word, lang, entry: data, timestamp: Date.now() },
        ...cache
      ];
      setCache(newCache);

      return data;
    } catch (error) {
      console.error("Dictionary lookup error:", error);
      setCurrentEntry(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getCache, setCache]);

  const reset = useCallback(() => {
    setCurrentEntry(null);
    setCurrentWord("");
    setIsLoading(false);
  }, []);

  return {
    lookupWord,
    currentEntry,
    currentWord,
    isLoading,
    reset
  };
};
