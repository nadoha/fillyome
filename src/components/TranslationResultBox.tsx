import { memo, useState } from "react";
import { Copy, Volume2, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface TranslationResultBoxProps {
  naturalTranslation: string;
  literalTranslation?: string;
  romanization?: string;
  onCopy: () => void;
  onSpeak: () => void;
  onTextSelect?: (e: React.MouseEvent) => void;
  onFeedback?: (type: 'positive' | 'negative') => void;
  isTranslating?: boolean;
  placeholder?: string;
}

export const TranslationResultBox = memo(({
  naturalTranslation,
  literalTranslation,
  romanization,
  onCopy,
  onSpeak,
  onTextSelect,
  onFeedback,
  isTranslating,
  placeholder
}: TranslationResultBoxProps) => {
  const [showLiteral, setShowLiteral] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="relative group animate-fade-in flex-1">
      <div 
        className="h-full min-h-[180px] sm:min-h-[220px] max-h-[600px] overflow-y-auto border border-border/50 bg-gradient-to-br from-card/60 to-muted/20 backdrop-blur-sm rounded-2xl p-4 pr-[110px] transition-all duration-300 hover:border-primary/40 shadow-sm hover:shadow-md"
        onMouseUp={onTextSelect}
      >
        {isTranslating ? (
          <div className="space-y-2 animate-fade-in">
            {/* Loading indicator */}
            <div className="absolute top-3 right-3 text-sm text-muted-foreground flex items-center gap-2 backdrop-blur-sm bg-background/80 px-3 py-1.5 rounded-lg shadow-sm z-20">
              <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="hidden xs:inline">번역중...</span>
            </div>
            
            {/* Skeleton for main translation */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-4/5" />
            </div>
            
            {/* Skeleton for romanization */}
            <div className="pt-3 border-t border-border/40">
              <Skeleton className="h-5 w-3/4" />
            </div>
            
            {/* Skeleton for literal translation toggle */}
            <div className="pt-3 border-t border-border/40">
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        ) : naturalTranslation ? (
          <div className="space-y-2">
            {/* Natural Translation */}
            <div className="text-base sm:text-lg leading-relaxed font-medium text-foreground animate-slide-up" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {naturalTranslation}
            </div>

            {/* Romanization */}
            {romanization && (
              <div className="pt-3 border-t border-border/40 animate-fade-in">
                <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed italic" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {romanization}
                </p>
              </div>
            )}

            {/* Literal Translation Toggle */}
            {literalTranslation && (
              <div className="pt-2 border-t border-border/40 animate-fade-in">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLiteral(!showLiteral)}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 -ml-2 rounded-lg transition-all duration-200"
                >
                  {showLiteral ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                  {t("literalTranslation")}
                </Button>
                {showLiteral && (
                  <div className="mt-2 pl-3 border-l-2 border-primary/40 bg-primary/5 backdrop-blur-sm rounded-r-lg py-2 pr-2 animate-slide-up">
                    <p className="text-xs sm:text-sm text-foreground/85 leading-relaxed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {literalTranslation}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Feedback Buttons */}
            {onFeedback && (
              <div className="pt-3 border-t border-border/30 flex flex-wrap items-center gap-1.5 sm:gap-2 animate-fade-in">
                <span className="text-sm text-muted-foreground mr-1">{t("howsThisTranslation")}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback('positive')}
                  className="h-8 w-8 hover:bg-green-500/15 hover:text-green-600 dark:hover:text-green-400 rounded-lg transition-all duration-200"
                  aria-label={t("good")}
                >
                  <ThumbsUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onFeedback('negative')}
                  className="h-8 w-8 hover:bg-orange-500/15 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-all duration-200"
                  aria-label={t("feelsOff")}
                >
                  <ThumbsDown className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/70 text-base sm:text-lg">{placeholder}</span>
        )}
      </div>
      
      {/* Copy, Speak, and Fullscreen Buttons */}
      {!isTranslating && naturalTranslation && (
        <div className="absolute top-3 right-3 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 z-20">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg border-border/60 bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
                  onClick={onCopy}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">복사</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg border-border/60 bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
                  onClick={onSpeak}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">듣기</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-lg border-border/60 bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200"
                  onClick={() => setIsFullScreen(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">전체 화면</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Fullscreen Modal */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>번역 결과</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            {/* Natural Translation */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">자연스러운 번역</h3>
              <div className="text-base sm:text-lg leading-relaxed font-medium text-foreground p-4 bg-muted/30 rounded-lg" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {naturalTranslation}
              </div>
            </div>

            {/* Romanization */}
            {romanization && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">발음</h3>
                <div className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed italic p-4 bg-muted/20 rounded-lg" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {romanization}
                </div>
              </div>
            )}

            {/* Literal Translation */}
            {literalTranslation && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">{t("literalTranslation")}</h3>
                <div className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed p-4 bg-muted/20 rounded-lg" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {literalTranslation}
                </div>
              </div>
            )}

            {/* Action Buttons in Modal */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={onCopy}
                className="flex-1"
              >
                <Copy className="h-4 w-4 mr-2" />
                복사
              </Button>
              <Button
                variant="outline"
                onClick={onSpeak}
                className="flex-1"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                듣기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

TranslationResultBox.displayName = "TranslationResultBox";
