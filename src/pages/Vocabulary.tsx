import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Plus, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VocabularyList } from "@/components/VocabularyList";
import { useVocabulary } from "@/hooks/useVocabulary";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { GuestModeBanner } from "@/components/GuestModeBanner";

const Vocabulary = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { vocabulary, isLoading, removeWord, updateNotes, user } = useVocabulary();
  const [searchQuery, setSearchQuery] = useState("");

  const isGuestMode = !user;

  const filteredVocabulary = vocabulary.filter(item => 
    item.word.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSpeak = async (text: string, lang: string) => {
    try {
      if (!('speechSynthesis' in window)) {
        toast.error('브라우저가 음성 재생을 지원하지 않습니다');
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      const langMap: Record<string, string> = {
        ko: 'ko-KR',
        ja: 'ja-JP',
        en: 'en-US',
        zh: 'zh-CN',
      };
      
      utterance.lang = langMap[lang] || lang;
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      toast.error('음성 재생에 실패했습니다');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20 md:pb-0">
        <div className="container max-w-4xl mx-auto px-4 py-6 sm:py-8 animate-page-transition">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="mb-4 rounded-full h-11 w-11 min-h-touch min-w-touch haptic"
              aria-label={t("goBack") || "돌아가기"}
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {t("myVocabulary") || "나의 단어장"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              {t("savedWords") || "저장한 단어"} {vocabulary.length}{t("korean") === "한국어" ? "개" : ""}
            </p>
          </div>

          {/* Guest Mode Banner */}
          {isGuestMode && (
            <GuestModeBanner message="로그인하면 단어를 저장할 수 있어요" />
          )}

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="단어 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 min-h-touch text-base"
              aria-label="단어 검색"
            />
          </div>

          {/* Empty State with Illustration */}
          {!isLoading && vocabulary.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <BookOpen className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">아직 저장한 단어가 없어요</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                번역 결과에서 단어를 탭하면 단어장에 저장됩니다
              </p>
              <Button onClick={() => navigate("/")} className="min-h-touch haptic">
                번역하러 가기
              </Button>
            </div>
          )}

          {/* Vocabulary List */}
          {(isLoading || vocabulary.length > 0) && (
            <VocabularyList
              vocabulary={filteredVocabulary}
              isLoading={isLoading}
              onRemove={removeWord}
              onUpdateNotes={updateNotes}
              onSpeak={handleSpeak}
            />
          )}

          {/* Floating Add Button */}
          <Button
            size="icon"
            className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg min-h-touch min-w-touch haptic md:hidden"
            onClick={() => navigate("/dictionary")}
            aria-label="단어 추가"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
      <BottomNavigation />
    </>
  );
};

export default Vocabulary;
