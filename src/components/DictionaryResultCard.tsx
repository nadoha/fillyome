import { Volume2, BookMarked, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface DictionaryResultCardProps {
  word: string;
  entry: any;
  isLoading: boolean;
  language: string;
  onAddToVocabulary: (word: string, language: string, entry: any) => void;
  isInVocabulary: boolean;
  onClose: () => void;
}

export const DictionaryResultCard = ({
  word,
  entry,
  isLoading,
  language,
  onAddToVocabulary,
  isInVocabulary,
  onClose
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

  if (isLoading) {
    return (
      <Card className="mt-6 animate-fade-in">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">검색 중...</p>
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
      </CardContent>
    </Card>
  );
};
