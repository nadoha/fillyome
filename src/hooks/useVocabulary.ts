import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DictionaryEntry {
  pos: string;
  definitions: string[];
  romanization?: string;
  example: string;
}

interface VocabularyItem {
  id: string;
  word: string;
  language: string;
  definition: DictionaryEntry;
  notes?: string;
  created_at: string;
}

export const useVocabulary = () => {
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadVocabulary();
      }
    });
  }, []);

  const loadVocabulary = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("vocabulary")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const typedData = (data || []).map(item => ({
        ...item,
        definition: item.definition as unknown as DictionaryEntry,
        notes: item.notes || undefined,
      }));
      
      setVocabulary(typedData);
    } catch (error) {
      console.error("Failed to load vocabulary:", error);
      toast.error("단어장을 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addWord = useCallback(async (word: string, language: string, definition: DictionaryEntry) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return false;
    }

    try {
      const { error } = await supabase
        .from("vocabulary")
        .insert([{
          word,
          language,
          definition: definition as any,
          user_id: user.id,
        }] as any);

      if (error) {
        if (error.code === '23505') {
          toast.error("이미 단어장에 추가된 단어입니다.");
          return false;
        }
        throw error;
      }

      await loadVocabulary();
      toast.success("단어장에 추가되었습니다.");
      return true;
    } catch (error) {
      console.error("Failed to add word:", error);
      toast.error("단어 추가에 실패했습니다.");
      return false;
    }
  }, [user, loadVocabulary]);

  const removeWord = useCallback(async (id: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return false;
    }

    try {
      const { error } = await supabase
        .from("vocabulary")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadVocabulary();
      toast.success("단어장에서 삭제되었습니다.");
      return true;
    } catch (error) {
      console.error("Failed to remove word:", error);
      toast.error("단어 삭제에 실패했습니다.");
      return false;
    }
  }, [user, loadVocabulary]);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return false;
    }

    try {
      const { error } = await supabase
        .from("vocabulary")
        .update({ notes })
        .eq("id", id);

      if (error) throw error;

      await loadVocabulary();
      toast.success("메모가 저장되었습니다.");
      return true;
    } catch (error) {
      console.error("Failed to update notes:", error);
      toast.error("메모 저장에 실패했습니다.");
      return false;
    }
  }, [user, loadVocabulary]);

  const isWordInVocabulary = useCallback((word: string, language: string) => {
    return vocabulary.some(item => item.word === word && item.language === language);
  }, [vocabulary]);

  return {
    vocabulary,
    isLoading,
    addWord,
    removeWord,
    updateNotes,
    isWordInVocabulary,
    loadVocabulary,
    user,
  };
};
