import { memo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Volume2, ChevronDown, ChevronUp, Check, AlertTriangle, RefreshCw, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
export interface Alternative {
  text: string;
  tags: string[];
  note?: string;
}
export interface UsageCard {
  type: "situation" | "tone" | "recommend" | "caution";
  title: string;
  items?: string[];
  text?: string;
}
export interface UsageExample {
  source: string;
  target: string;
}
interface UsageCardsProps {
  alternatives?: Alternative[];
  usageCards?: UsageCard[];
  example?: UsageExample | null;
  onAlternativeSpeak?: (text: string) => void;
  isLoading?: boolean;
  showCards?: boolean;
}

// Card styling based on type - Zero Learning Curve principle
const cardConfig: Record<string, {
  icon: React.ElementType;
  borderColor: string;
  bgColor: string;
  textColor: string;
  emoji: string;
}> = {
  recommend: {
    icon: Check,
    borderColor: "border-l-emerald-500",
    bgColor: "bg-emerald-50/50 dark:bg-emerald-950/20",
    textColor: "text-emerald-700 dark:text-emerald-300",
    emoji: "✅"
  },
  caution: {
    icon: AlertTriangle,
    borderColor: "border-l-amber-500",
    bgColor: "bg-amber-50/50 dark:bg-amber-950/20",
    textColor: "text-amber-700 dark:text-amber-300",
    emoji: "⚠️"
  },
  situation: {
    icon: FileText,
    borderColor: "border-l-slate-400",
    bgColor: "bg-slate-50/50 dark:bg-slate-900/30",
    textColor: "text-slate-700 dark:text-slate-300",
    emoji: "📍"
  },
  tone: {
    icon: Volume2,
    borderColor: "border-l-violet-400",
    bgColor: "bg-violet-50/50 dark:bg-violet-950/20",
    textColor: "text-violet-700 dark:text-violet-300",
    emoji: "🎭"
  },
  alternative: {
    icon: RefreshCw,
    borderColor: "border-l-cyan-500",
    bgColor: "bg-cyan-50/50 dark:bg-cyan-950/20",
    textColor: "text-cyan-700 dark:text-cyan-300",
    emoji: "🔄"
  },
  example: {
    icon: FileText,
    borderColor: "border-l-slate-300",
    bgColor: "bg-slate-50/30 dark:bg-slate-900/20",
    textColor: "text-slate-600 dark:text-slate-400",
    emoji: "📝"
  }
};

// Single expandable card component
const ExpandableCard = memo(({
  type,
  title,
  children,
  defaultExpanded = false,
  delay = 0,
  showCards = false
}: {
  type: string;
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  delay?: number;
  showCards?: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isVisible, setIsVisible] = useState(false);
  const config = cardConfig[type] || cardConfig.situation;

  // Progressive disclosure animation
  useEffect(() => {
    if (showCards) {
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showCards, delay]);
  return <Card className={cn("border-l-4 transition-all duration-300 overflow-hidden cursor-pointer", config.borderColor, config.bgColor, isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2", !isExpanded && "py-1.5 px-3", isExpanded && "py-2 px-3")} style={{
    transitionDelay: isVisible ? '0ms' : `${delay}ms`,
    transform: isVisible ? 'translateY(0)' : 'translateY(8px)'
  }} onClick={() => setIsExpanded(!isExpanded)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs">{config.emoji}</span>
          <span className={cn("text-xs font-medium", config.textColor)}>
            {title}
          </span>
        </div>
        {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </div>
      
      <div className={cn("overflow-hidden transition-all duration-200", isExpanded ? "max-h-48 mt-2 opacity-100" : "max-h-0 opacity-0")}>
        {children}
      </div>
    </Card>;
});
ExpandableCard.displayName = "ExpandableCard";

// Quick badge for instant feedback (3-second test principle)
const QuickBadge = memo(({
  text,
  type,
  delay = 0,
  showCards = false
}: {
  text: string;
  type: "ok" | "avoid";
  delay?: number;
  showCards?: boolean;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    if (showCards) {
      const timer = setTimeout(() => setIsVisible(true), delay);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [showCards, delay]);
  return <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 transition-all duration-300", type === "ok" ? "border-success bg-success/10 text-success dark:bg-success/20" : "border-warning bg-warning/10 text-warning dark:bg-warning/20", isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90")}>
      {type === "ok" ? "✓" : "✗"} {text}
    </Badge>;
});
QuickBadge.displayName = "QuickBadge";
export const UsageCards = memo(({
  alternatives = [],
  usageCards = [],
  example,
  onAlternativeSpeak,
  isLoading = false,
  showCards = false
}: UsageCardsProps) => {
  // Don't render anything if no cards or alternatives
  const hasContent = alternatives.length > 0 || usageCards.length > 0 || example;
  if (!hasContent && !isLoading) return null;

  // Extract quick badges from recommend/caution cards
  const recommendCard = usageCards.find(c => c.type === "recommend");
  const cautionCard = usageCards.find(c => c.type === "caution");
  const situationCard = usageCards.find(c => c.type === "situation");
  const toneCard = usageCards.find(c => c.type === "tone");

  // Extract quick badge info from items or text
  const getQuickBadgeText = (card: UsageCard | undefined, maxLen = 8): string => {
    if (!card) return "";
    if (card.items && card.items.length > 0) return card.items[0].slice(0, maxLen);
    if (card.text) return card.text.slice(0, maxLen);
    return "";
  };
  const recommendBadge = getQuickBadgeText(recommendCard);
  const cautionBadge = getQuickBadgeText(cautionCard);
  return <div className="mt-3 space-y-2">
      {/* Loading indicator for context cards only */}
      {isLoading && <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
          <div className="h-1 w-1 rounded-full bg-foreground/40 animate-bounce" />
          <div className="h-1 w-1 rounded-full bg-foreground/40 animate-bounce" style={{
        animationDelay: '100ms'
      }} />
          <div className="h-1 w-1 rounded-full bg-foreground/40 animate-bounce" style={{
        animationDelay: '200ms'
      }} />
        </div>}

      {/* Quick badges - 1 second fade-in (3-second test principle) */}
      {recommendBadge || cautionBadge}

      {/* Alternatives Section - 1.5 second slide-up */}
      {alternatives.length > 0 && <ExpandableCard type="alternative" title="다른 표현" defaultExpanded={false} delay={1200} showCards={showCards}>
          <div className="space-y-2">
            {alternatives.map((alt, idx) => <div key={idx} className="flex items-center justify-between p-2 rounded bg-background/50 hover:bg-background transition-colors group cursor-pointer" onClick={e => {
          e.stopPropagation();
          onAlternativeSpeak?.(alt.text);
        }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{alt.text}</span>
                    <Volume2 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    {alt.tags.map((tag, tagIdx) => <Badge key={tagIdx} variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                        {tag}
                      </Badge>)}
                  </div>
                  {alt.note && <p className="text-[10px] text-muted-foreground mt-1">{alt.note}</p>}
                </div>
              </div>)}
          </div>
        </ExpandableCard>}

      {/* Recommend Card */}
      {recommendCard && recommendCard.text && <ExpandableCard type="recommend" title="추천" defaultExpanded={false} delay={1400} showCards={showCards}>
          <p className="text-xs leading-relaxed">{recommendCard.text}</p>
          {recommendCard.items && recommendCard.items.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">
              {recommendCard.items.map((item, idx) => <Badge key={idx} variant="outline" className="text-[9px] border-success/50">
                  {item}
                </Badge>)}
            </div>}
        </ExpandableCard>}

      {/* Caution Card */}
      {cautionCard && cautionCard.text && <ExpandableCard type="caution" title="주의" defaultExpanded={false} delay={1500} showCards={showCards}>
          <p className="text-xs leading-relaxed">{cautionCard.text}</p>
          {cautionCard.items && cautionCard.items.length > 0 && <div className="flex flex-wrap gap-1 mt-1.5">
              {cautionCard.items.map((item, idx) => <Badge key={idx} variant="outline" className="text-[9px] border-warning/50">
                  {item}
                </Badge>)}
            </div>}
        </ExpandableCard>}

      {/* Situation Card */}
      {situationCard && situationCard.items && situationCard.items.length > 0 && <ExpandableCard type="situation" title="상황" defaultExpanded={false} delay={1600} showCards={showCards}>
          <div className="flex flex-wrap gap-1">
            {situationCard.items.map((item, idx) => <Badge key={idx} variant="secondary" className="text-[10px]">
                {item}
              </Badge>)}
          </div>
        </ExpandableCard>}

      {/* Tone Card */}
      {toneCard && toneCard.items && toneCard.items.length > 0 && <ExpandableCard type="tone" title="톤" defaultExpanded={false} delay={1700} showCards={showCards}>
          <div className="flex flex-wrap gap-1">
            {toneCard.items.map((item, idx) => <Badge key={idx} variant="secondary" className="text-[10px]">
                {item}
              </Badge>)}
          </div>
        </ExpandableCard>}

      {/* Example Section */}
      {example && example.source && example.target && <ExpandableCard type="example" title="예문" defaultExpanded={false} delay={1800} showCards={showCards}>
          <div className="space-y-1">
            <p className="text-sm">{example.source}</p>
            <p className="text-xs text-muted-foreground">{example.target}</p>
          </div>
        </ExpandableCard>}
    </div>;
});
UsageCards.displayName = "UsageCards";