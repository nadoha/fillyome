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
      <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-3xl">
        <div className="space-y-3 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{word}</h3>
              {entry?.romanization && (
                <p className="text-xs text-muted-foreground italic">{entry.romanization}</p>
              )}
            </div>
            {entry && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
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
            <div className="space-y-2">
              {/* Definitions - Default 2 lines */}
              <div className={`space-y-1.5 ${!isExpanded ? 'line-clamp-2' : ''}`}>
                {entry.definitions.slice(0, isExpanded ? undefined : 2).map((def, idx) => (
                  <p key={idx} className="text-sm text-foreground">
                    {idx + 1}. {def}
                  </p>
                ))}
              </div>

              {/* Example - Only show when expanded */}
              {isExpanded && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Example:</p>
                  <p className="text-sm italic">{entry.example}</p>
                </div>
              )}

              {/* More Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full text-xs mt-2"
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
