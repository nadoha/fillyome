import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface DictionaryEntry {
  pos: string;
  definitions: string[];
  romanization?: string;
  example: string;
}

interface DictionarySheetProps {
  isOpen: boolean;
  onClose: () => void;
  word: string;
  entry: DictionaryEntry | null;
  isLoading: boolean;
}

export const DictionarySheet = ({ isOpen, onClose, word, entry, isLoading }: DictionarySheetProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-2xl">
        <div className="space-y-2 pb-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">{word}</h3>
              {entry?.romanization && (
                <p className="text-xs text-muted-foreground/70 italic">{entry.romanization}</p>
              )}
            </div>
            {entry && (
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {entry.pos}
              </span>
            )}
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
                {entry.definitions.slice(0, isExpanded ? undefined : 2).map((def, idx) => (
                  <p key={idx} className="text-base text-foreground/90 leading-relaxed">
                    {idx + 1}. {def}
                  </p>
                ))}
              </div>

              {/* Example */}
              {isExpanded && (
                <div className="pt-1.5 border-t border-border/50">
                  <p className="text-sm text-muted-foreground/70 mb-0.5">Example:</p>
                  <p className="text-base italic text-foreground/80 leading-relaxed">{entry.example}</p>
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
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    More
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Error State */}
          {!isLoading && !entry && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No definition found
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
