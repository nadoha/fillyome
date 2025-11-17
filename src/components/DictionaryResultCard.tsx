import { Volume2, BookMarked, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import React from "react";

interface DictionaryResultCardProps {
  word: string;
  entry: any;
  isLoading: boolean;
  language: string;
  onAddToVocabulary: (word: string, language: string, entry: any) => void;
  isInVocabulary: boolean;
  onClose: () => void;
  notFound?: boolean;
  errorMessage?: string;
  onRelatedWordClick?: (word: string) => void;
}

export const DictionaryResultCard = ({
  word,
  entry,
  isLoading,
  language,
  onAddToVocabulary,
  isInVocabulary,
  onClose,
  notFound,
  errorMessage,
  onRelatedWordClick
}: DictionaryResultCardProps) => {
  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language;
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const loadingTips = [
    "💡 단어를 여러 번 검색하면 인기 검색어로 표시됩니다",
    "🔖 자주 쓰는 단어는 단어장에 저장해보세요",
    "🎯 문장 속 단어를 클릭하면 빠르게 검색할 수 있어요",
    "✨ 발음이 궁금하다면 스피커 버튼을 눌러보세요",
    "📚 예문으로 단어의 실제 활용법을 익혀보세요"
  ];
  
  const [currentTip, setCurrentTip] = React.useState(loadingTips[Math.floor(Math.random() * loadingTips.length)]);

  React.useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setCurrentTip(loadingTips[Math.floor(Math.random() * loadingTips.length)]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <Card className="mt-6 animate-fade-in border-primary/20">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <div className="absolute inset-0 h-12 w-12 border-4 border-transparent border-t-secondary rounded-full animate-spin" style={{ animationDuration: '1s', animationDirection: 'reverse' }} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-foreground">사전 검색 중...</p>
              <p className="text-xs text-muted-foreground animate-fade-in px-4 max-w-xs">
                {currentTip}
              </p>
            </div>
            <div className="w-full max-w-xs bg-muted rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-full rounded-full animate-[slide-in-right_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notFound) {
    return (
      <Card className="mt-6 animate-fade-in border-destructive/30">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-xl sm:text-2xl font-bold text-destructive flex items-center gap-2">
                "{word}"
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <div className="text-5xl">🔍</div>
            <p className="text-base font-semibold text-foreground">단어를 찾을 수 없습니다</p>
            <p className="text-sm text-muted-foreground text-center">
              {errorMessage || "올바른 단어인지 확인해주세요"}
            </p>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <p>• 철자가 정확한지 확인해보세요</p>
              <p>• 완전한 단어를 입력했는지 확인해보세요</p>
              <p>• 다른 언어의 단어일 수 있습니다</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!entry || !word) {
    return null;
  }

  return (
    <Card className="mt-6 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              {word}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleSpeak(word)}
              >
                <Volume2 className="h-4 w-4" />
              </Button>
            </CardTitle>
            {entry.pronunciation && (
              <p className="text-sm text-muted-foreground mt-1">[{entry.pronunciation}]</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={isInVocabulary ? "secondary" : "default"}
              size="sm"
              onClick={() => onAddToVocabulary(word, language, entry)}
              disabled={isInVocabulary}
              className="shrink-0"
            >
              <BookMarked className="h-4 w-4 mr-1" />
              {isInVocabulary ? "저장됨" : "저장"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {entry.definitions && entry.definitions.length > 0 && (
          <div className="space-y-3">
            {entry.definitions.map((def: any, idx: number) => (
              <div key={idx} className="space-y-2">
                {def.partOfSpeech && (
                  <Badge variant="secondary" className="text-xs">
                    {def.partOfSpeech}
                  </Badge>
                )}
                <div className="space-y-1.5">
                  {def.meanings?.map((meaning: string, mIdx: number) => (
                    <p key={mIdx} className="text-sm leading-relaxed">
                      <span className="font-semibold mr-2">{mIdx + 1}.</span>
                      {meaning}
                    </p>
                  ))}
                </div>
                {def.examples && def.examples.length > 0 && (
                  <div className="pl-4 space-y-1 border-l-2 border-muted">
                    {def.examples.map((example: string, eIdx: number) => (
                      <p key={eIdx} className="text-xs text-muted-foreground italic">
                        · {example}
                      </p>
                    ))}
                  </div>
                )}
                {idx < entry.definitions.length - 1 && <Separator className="my-3" />}
              </div>
            ))}
          </div>
        )}

        {entry.synonyms && entry.synonyms.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">유의어</p>
            <div className="flex flex-wrap gap-2">
              {entry.synonyms.map((synonym: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {synonym}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {entry.antonyms && entry.antonyms.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold">반의어</p>
            <div className="flex flex-wrap gap-2">
              {entry.antonyms.map((antonym: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {antonym}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {entry.relatedWords && entry.relatedWords.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1">
              <span>연관 단어</span>
              <span className="text-xs text-muted-foreground">(클릭하여 검색)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {entry.relatedWords.map((relatedWord: string, idx: number) => (
                <Badge 
                  key={idx} 
                  variant="secondary" 
                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => onRelatedWordClick?.(relatedWord)}
                >
                  {relatedWord}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
