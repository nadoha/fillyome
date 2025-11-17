import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DictionarySearchInput } from "@/components/DictionarySearchInput";
import { DictionarySheet } from "@/components/DictionarySheet";
import { useDictionary } from "@/hooks/useDictionary";
import { useVocabulary } from "@/hooks/useVocabulary";

const Dictionary = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [sourceLang, setSourceLang] = useState<string>(() => {
    const saved = localStorage.getItem('lastSourceLang');
    return saved || "ko";
  });
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);
  
  const { lookupWord, currentEntry, currentWord, isLoading: isDictionaryLoading, reset: resetDictionary } = useDictionary();
  const { addWord, isWordInVocabulary } = useVocabulary();

  const handleDictionarySearch = async (word: string, lang: string) => {
    setSourceLang(lang);
    const userLang = i18n.language;
    await lookupWord(word, lang, userLang);
    setIsDictionaryOpen(true);
  };

  const handleAddToVocabulary = async (word: string, language: string, entry: any) => {
    await addWord(word, language, entry);
  };

  const handleSpeak = (text: string, lang: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로 가기
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">사전 검색</h1>
          <p className="text-muted-foreground">단어의 정확한 뜻과 용례를 확인하세요</p>
        </div>

        <div className="bg-card rounded-2xl shadow-lg p-6 border border-border/50">
          <DictionarySearchInput 
            onSearch={handleDictionarySearch}
            sourceLang={sourceLang}
          />
        </div>

        <DictionarySheet
          isOpen={isDictionaryOpen}
          onClose={() => setIsDictionaryOpen(false)}
          word={currentWord}
          entry={currentEntry}
          isLoading={isDictionaryLoading}
          language={sourceLang}
          onAddToVocabulary={handleAddToVocabulary}
          isInVocabulary={isWordInVocabulary(currentWord, sourceLang)}
        />
      </div>
    </div>
  );
};

export default Dictionary;
