import { memo, useState } from "react";
import { Copy, Volume2, Mic, MicOff, Filter, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
interface TranslationBoxProps {
  value: string;
  onChange?: (value: string) => void;
  onCopy: () => void;
  onSpeak: () => void;
  onTextSelect?: (e: React.MouseEvent) => void;
  placeholder?: string;
  isTranslating?: boolean;
  isEditable?: boolean;
  romanization?: string;
  onMicClick?: () => void;
  isListening?: boolean;
  noiseCancellation?: boolean;
  onToggleNoiseCancellation?: () => void;
  audioLevel?: number;
}
export const TranslationBox = memo(({
  value,
  onChange,
  onCopy,
  onSpeak,
  onTextSelect,
  placeholder,
  isTranslating,
  isEditable = false,
  romanization,
  onMicClick,
  isListening = false,
  noiseCancellation = true,
  onToggleNoiseCancellation,
  audioLevel = 0
}: TranslationBoxProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (isEditable) {
    return <div className="relative group animate-fade-in flex-1">
        {isListening && <div className="absolute inset-0 rounded-2xl bg-primary/5 animate-pulse pointer-events-none z-10 border-2 border-primary/30" />}
        {isListening && <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 px-3 py-2 bg-primary/95 text-primary-foreground rounded-xl text-xs font-medium shadow-lg animate-fade-in backdrop-blur-sm border border-primary-foreground/20 max-w-[calc(100%-2rem)]">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 items-end h-5">
                {[...Array(6)].map((_, i) => {
              const barHeight = Math.max(6, audioLevel / 100 * 20 * (0.5 + Math.random() * 0.5));
              return <div key={i} className="w-0.5 bg-current rounded-full transition-all duration-100 ease-out" style={{
                height: `${isListening ? barHeight : 6}px`,
                animationDelay: `${i * 50}ms`
              }} />;
            })}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  <span className="font-semibold">음성 인식 활성화</span>
                </div>
                {audioLevel > 5 ? <span className="text-[10px] opacity-90 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-green-400" />
                    목소리 감지됨 ({Math.round(audioLevel)}%)
                  </span> : <span className="text-[10px] opacity-90 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-yellow-400 animate-pulse" />
                    목소리를 기다리는 중...
                  </span>}
              </div>
            </div>
            {value && <div className="text-[10px] opacity-80 max-w-[280px] truncate border-t border-primary-foreground/20 pt-1.5 mt-0.5 w-full">
                감지: "{value.slice(0, 40)}{value.length > 40 ? '...' : ''}"
              </div>}
          </div>}
        <Textarea 
          placeholder={placeholder} 
          value={value} 
          onChange={e => onChange?.(e.target.value)} 
          onFocus={(e) => {
            const target = e.target;
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              });
            });
          }}
          className={`h-full min-h-[240px] max-h-[600px] resize-none text-base sm:text-lg leading-relaxed border border-border/50 bg-card/30 backdrop-blur-sm rounded-2xl p-4 pr-16 focus-visible:ring-2 focus-visible:ring-primary shadow-sm hover:shadow-md transition-all duration-200 ${isListening ? 'border-primary/60 ring-2 ring-primary/20' : ''}`} 
          autoFocus 
        />
          <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 z-20">
          {onMicClick && <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className={`h-10 w-10 rounded-xl border-border/60 bg-card/90 backdrop-blur-sm shadow-sm transition-all duration-200 ${isListening ? 'bg-destructive text-destructive-foreground border-destructive animate-pulse' : 'hover:bg-primary hover:text-primary-foreground hover:border-primary'}`} onClick={onMicClick}>
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p className="text-xs">{isListening ? '중지' : '음성'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>}
          {value && <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={onCopy}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">복사</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={onSpeak}>
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-xs">듣기</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>}
        </div>
      </div>;
  }
  return <div className="relative group animate-fade-in flex-1">
      <div className="h-full min-h-[280px] max-h-[600px] overflow-y-auto border border-border/50 bg-muted/30 backdrop-blur-sm rounded-2xl p-4 pr-16 select-text transition-all duration-200 hover:bg-muted/40 hover:border-primary/30 shadow-sm" onMouseUp={onTextSelect}>
        <div className="text-base sm:text-lg leading-relaxed" style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
          {value || <span className="text-muted-foreground/70">{placeholder}</span>}
        </div>
        {romanization && value && <div className="mt-3 pt-3 border-t border-border/50 text-sm sm:text-base text-muted-foreground/80 leading-relaxed" style={{
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
            {romanization}
          </div>}
      </div>
      {isTranslating && <div className="absolute top-3 right-16 text-sm text-muted-foreground flex items-center gap-2 animate-fade-in backdrop-blur-sm bg-background/80 px-3 py-1.5 rounded-lg shadow-sm z-20">
          <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="hidden xs:inline">번역중...</span>
        </div>}
      {!isTranslating && value && <div className="absolute top-3 right-3 flex flex-col gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 z-20">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={onCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">복사</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={onSpeak}>
                  <Volume2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">듣기</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 bg-card/90 backdrop-blur-sm hover:bg-primary hover:text-primary-foreground hover:border-primary shadow-sm transition-all duration-200" onClick={() => setIsFullScreen(true)}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">전체 화면</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>}

      {/* Fullscreen Modal */}
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>번역 내용</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 mt-4">
            <div className="text-base sm:text-lg leading-relaxed p-4 bg-muted/30 rounded-lg" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {value}
            </div>
            {romanization && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">발음</h3>
                <div className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed italic p-4 bg-muted/20 rounded-lg" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {romanization}
                </div>
              </div>
            )}
            <div className="flex gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onCopy} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                복사
              </Button>
              <Button variant="outline" onClick={onSpeak} className="flex-1">
                <Volume2 className="h-4 w-4 mr-2" />
                듣기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>;
});
TranslationBox.displayName = "TranslationBox";