import { memo, useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface TappableWordsProps {
  text: string;
  savedWords: Set<string>;
  onWordTap: (word: string) => void;
  className?: string;
}

// Tokenize text while preserving punctuation and spaces
const tokenizeText = (text: string): { word: string; isWord: boolean }[] => {
  const tokens: { word: string; isWord: boolean }[] = [];
  
  // Match words (including CJK characters) and non-word sequences
  const regex = /([a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]+)|([^a-zA-Z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]+)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    tokens.push({
      word: match[0],
      isWord: match[1] !== undefined,
    });
  }
  
  return tokens;
};

export const TappableWords = memo(({ text, savedWords, onWordTap, className }: TappableWordsProps) => {
  const [recentlySaved, setRecentlySaved] = useState<Set<string>>(new Set());
  const tokens = tokenizeText(text);

  const handleWordClick = (word: string) => {
    if (!savedWords.has(word) && !recentlySaved.has(word)) {
      onWordTap(word);
      setRecentlySaved(prev => new Set(prev).add(word));
    }
  };

  return (
    <span className={cn("inline", className)}>
      {tokens.map((token, idx) => {
        if (!token.isWord) {
          return <span key={idx}>{token.word}</span>;
        }

        const isSaved = savedWords.has(token.word) || recentlySaved.has(token.word);
        
        return (
          <span
            key={idx}
            onClick={() => handleWordClick(token.word)}
            className={cn(
              "relative inline-flex items-center cursor-pointer transition-all duration-200 rounded px-0.5 -mx-0.5",
              isSaved
                ? "bg-primary/10 text-primary"
                : "hover:bg-primary/5 hover:text-primary active:scale-95"
            )}
            title={isSaved ? "저장됨" : "탭하여 저장"}
          >
            {token.word}
            {isSaved && (
              <Check className="inline-block h-3 w-3 ml-0.5 text-primary" />
            )}
          </span>
        );
      })}
    </span>
  );
});

TappableWords.displayName = "TappableWords";
