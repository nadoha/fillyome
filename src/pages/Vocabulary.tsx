import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VocabularyList } from "@/components/VocabularyList";
import { useVocabulary } from "@/hooks/useVocabulary";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";

const Vocabulary = () => {
  const navigate = useNavigate();
  const { vocabulary, isLoading, removeWord, updateNotes, loadVocabulary, user } = useVocabulary();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요한 서비스입니다.");
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate]);

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

      const voices = window.speechSynthesis.getVoices();
      const targetLang = langMap[lang] || lang;
      const languageVoices = voices.filter(voice => 
        voice.lang.startsWith(targetLang.split('-')[0])
      );

      let selectedVoice = languageVoices.find(voice => 
        voice.name.includes('Google') && !voice.localService
      ) || languageVoices[0] || null;

      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

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
        <div className="container max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
              className="mb-4 rounded-full h-10 w-10 sm:h-11 sm:w-11"
              aria-label="돌아가기"
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              나의 단어장
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">
              저장한 단어 {vocabulary.length}개
            </p>
          </div>

          {/* Vocabulary List */}
          <VocabularyList
            vocabulary={vocabulary}
            isLoading={isLoading}
            onRemove={removeWord}
            onUpdateNotes={updateNotes}
            onSpeak={handleSpeak}
          />
        </div>
      </div>
      <BottomNavigation />
    </>
  );
};

export default Vocabulary;
