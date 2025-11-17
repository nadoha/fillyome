import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DictionarySearchInput } from "@/components/DictionarySearchInput";
import { DictionaryResultCard } from "@/components/DictionaryResultCard";
import { useDictionary } from "@/hooks/useDictionary";
import { useVocabulary } from "@/hooks/useVocabulary";
import { BottomNavigation } from "@/components/BottomNavigation";

const Dictionary = () => {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const [sourceLang, setSourceLang] = useState<string>(() => {
    const saved = localStorage.getItem('lastSourceLang');
    return saved || "ko";
  });
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const { lookupWord, currentEntry, currentWord, isLoading: isDictionaryLoading, reset: resetDictionary } = useDictionary();
  const { addWord, isWordInVocabulary } = useVocabulary();

  const handleDictionarySearch = async (word: string, lang: string) => {
    setSourceLang(lang);
    setNotFound(false);
    setErrorMessage("");
    const userLang = i18n.language;
    const result = await lookupWord(word, lang, userLang);
    
    // Check if word was not found
    if (result?.notFound) {
      setNotFound(true);
      setErrorMessage(result.errorMessage || "단어를 찾을 수 없습니다");
    }
  };

  const handleRelatedWordClick = (relatedWord: string) => {
    handleDictionarySearch(relatedWord, sourceLang);
  };

  const handleAddToVocabulary = async (word: string, language: string, entry: any) => {
    await addWord(word, language, entry);
  };

  const handleClose = () => {
    resetDictionary();
    setNotFound(false);
    setErrorMessage("");
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-20 md:pb-0">
        <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div className="mb-6 sm:mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="gap-2 rounded-full h-10 w-10 sm:h-11 sm:w-11 mb-4"
              aria-label={t("back") || "뒤로 가기"}
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </div>

          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t("dictionarySearch") || "사전 검색"}</h1>
            <p className="text-sm sm:text-base text-muted-foreground">{t("dictionarySearchDesc") || "단어의 정확한 뜻과 용례를 확인하세요"}</p>
          </div>

          <div className="bg-card rounded-2xl shadow-lg p-4 sm:p-6 border border-border/50">
            <DictionarySearchInput 
              onSearch={handleDictionarySearch}
              sourceLang={sourceLang}
            />
          </div>

          {(currentWord || isDictionaryLoading) && (
            <DictionaryResultCard
              word={currentWord}
              entry={currentEntry}
              isLoading={isDictionaryLoading}
              language={sourceLang}
              onAddToVocabulary={handleAddToVocabulary}
              isInVocabulary={isWordInVocabulary(currentWord, sourceLang)}
              onClose={handleClose}
              notFound={notFound}
              errorMessage={errorMessage}
              onRelatedWordClick={handleRelatedWordClick}
            />
          )}
        </div>
      </div>
      <BottomNavigation />
    </>
  );
};

export default Dictionary;
