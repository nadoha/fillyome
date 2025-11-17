import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2, BookmarkPlus, BookmarkCheck } from "lucide-react";

interface DictionaryDefinition {
  partOfSpeech: string;
  meanings: string[];
  examples: string[];
}

interface DictionaryEntry {
  pronunciation?: string;
  definitions: DictionaryDefinition[];
  synonyms?: string[];
  antonyms?: string[];
}

interface DictionarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  entry: DictionaryEntry | null;
  isLoading: boolean;
  language?: string;
  onAddToVocabulary?: (word: string, language: string, entry: DictionaryEntry) => void;
  isInVocabulary?: boolean;
}

export const DictionarySheet = ({ isOpen, onClose, word, entry, isLoading, language, onAddToVocabulary, isInVocabulary }: DictionarySheetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddToVocabulary = () => {
    if (entry && language && onAddToVocabulary) {
      onAddToVocabulary(word, language, entry);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-2xl">
        <div className="space-y-2 pb-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">{word}</h3>
              {entry?.pronunciation && (
                <p className="text-xs text-muted-foreground/70 italic">{entry.pronunciation}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {entry && entry.definitions[0] && (
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  {entry.definitions[0].partOfSpeech}
                </span>
              )}
              {entry && onAddToVocabulary && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleAddToVocabulary}
                  className="h-8 px-2"
                  disabled={isInVocabulary}
                >
                  {isInVocabulary ? (
                    <>
                      <BookmarkCheck className="h-4 w-4 mr-1" />
                      <span className="text-xs">저장됨</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus className="h-4 w-4 mr-1" />
                      <span className="text-xs">단어장</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {/* Content */}
          {!isLoading && entry && (
            <div className="space-y-1.5">
              {/* Definitions */}
              <div className={`space-y-1 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                {entry.definitions.map((def, idx) => (
                  <div key={idx}>
                    {def.meanings.map((meaning, mIdx) => (
                      <p key={mIdx} className="text-base text-foreground/90 leading-relaxed">
                        {mIdx + 1}. {meaning}
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Examples */}
              {isExpanded && entry.definitions[0]?.examples && (
                <div className="pt-1.5 border-t border-border/50">
                  <p className="text-sm text-muted-foreground/70 mb-0.5">Example:</p>
                  {entry.definitions[0].examples.map((example, idx) => (
                    <p key={idx} className="text-base italic text-foreground/80 leading-relaxed">{example}</p>
                  ))}
                </div>
              )}

              {/* More Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-xs h-7 mt-1"
              >
                {isExpanded ? (
                  <>
                    <span>접기</span>
                    <ChevronUp className="h-3 w-3 ml-1" />
                  </>
                ) : (
                  <>
                    <span>더보기</span>
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
