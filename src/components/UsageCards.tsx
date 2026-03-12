import { memo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Volume2, ChevronRight } from "lucide-react";
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

// Compact inline card
const ContextChip = memo(({
  type,
  text,
  delay = 0,
  showCards = false,
}: {
  type: "recommend" | "caution" | "situation" | "tone";
  text: string;
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

  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    recommend: { bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-300", icon: "✓" },
    caution: { bg: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-700 dark:text-amber-300", icon: "!" },
    situation: { bg: "bg-muted/60", text: "text-muted-foreground", icon: "📍" },
    tone: { bg: "bg-violet-500/10 dark:bg-violet-500/15", text: "text-violet-700 dark:text-violet-300", icon: "🎭" },
  };

  const s = styles[type] || styles.situation;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-300",
        s.bg, s.text,
        isVisible ? "opacity-100 scale-100" : "opacity-0 scale-90"
      )}
    >
      <span className="text-[10px]">{s.icon}</span>
      {text}
    </span>
  );
});
ContextChip.displayName = "ContextChip";

// Alternative expression row
const AlternativeRow = memo(({
  alt,
  onSpeak,
  delay = 0,
  showCards = false,
}: {
  alt: Alternative;
  onSpeak?: (text: string) => void;
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

  return (
    <div
      className={cn(
        "group flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-300 cursor-pointer",
        "hover:bg-muted/50 active:scale-[0.98]",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-3"
      )}
      onClick={() => onSpeak?.(alt.text)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{alt.text}</span>
          <Volume2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-colors" />
        </div>
        <div className="flex items-center gap-1.5 mt-1">
          {alt.tags.map((tag, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="text-[10px] px-1.5 py-0 h-[18px] rounded-md bg-muted/80 text-muted-foreground font-normal"
            >
              {tag}
            </Badge>
          ))}
        </div>
        {alt.note && (
          <p className="text-[11px] text-muted-foreground/70 mt-1 leading-snug">{alt.note}</p>
        )}
      </div>
      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
    </div>
  );
});
AlternativeRow.displayName = "AlternativeRow";

// Usage detail card (situation/tone with items)
const DetailCard = memo(({
  type,
  title,
  items,
  text,
  delay = 0,
  showCards = false,
}: {
  type: string;
  title: string;
  items?: string[];
  text?: string;
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

  const icons: Record<string, string> = {
    recommend: "✓",
    caution: "⚠",
    situation: "📍",
    tone: "🎭",
  };

  const borderColors: Record<string, string> = {
    recommend: "border-l-emerald-400/60",
    caution: "border-l-amber-400/60",
    situation: "border-l-border",
    tone: "border-l-violet-400/60",
  };

  return (
    <div
      className={cn(
        "border-l-2 pl-3 py-1.5 transition-all duration-300",
        borderColors[type] || "border-l-border",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <p className="text-[11px] font-medium text-muted-foreground mb-1">
        <span className="mr-1">{icons[type] || "•"}</span>
        {title}
      </p>
      {text && (
        <p className="text-xs leading-relaxed text-foreground/80">{text}</p>
      )}
      {items && items.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {items.map((item, i) => (
            <span key={i} className="text-xs text-foreground/80">{item}</span>
          ))}
        </div>
      )}
    </div>
  );
});
DetailCard.displayName = "DetailCard";

export const UsageCards = memo(({
  alternatives = [],
  usageCards = [],
  example,
  onAlternativeSpeak,
  isLoading = false,
  showCards = false
}: UsageCardsProps) => {
  const hasContent = alternatives.length > 0 || usageCards.length > 0 || example;
  if (!hasContent && !isLoading) return null;

  const recommendCard = usageCards.find(c => c.type === "recommend");
  const cautionCard = usageCards.find(c => c.type === "caution");
  const otherCards = usageCards.filter(c => c.type !== "recommend" && c.type !== "caution");

  return (
    <div className="mt-3 space-y-3">
      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <div className="flex gap-1">
            <div className="h-1 w-1 rounded-full bg-foreground/30 animate-bounce" />
            <div className="h-1 w-1 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '100ms' }} />
            <div className="h-1 w-1 rounded-full bg-foreground/30 animate-bounce" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      )}

      {/* Quick context chips */}
      {(recommendCard || cautionCard) && (
        <div className="flex flex-wrap gap-1.5">
          {recommendCard && (
            <ContextChip
              type="recommend"
              text={recommendCard.text?.slice(0, 20) || recommendCard.items?.[0]?.slice(0, 20) || ""}
              delay={600}
              showCards={showCards}
            />
          )}
          {cautionCard && (
            <ContextChip
              type="caution"
              text={cautionCard.text?.slice(0, 20) || cautionCard.items?.[0]?.slice(0, 20) || ""}
              delay={700}
              showCards={showCards}
            />
          )}
        </div>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="space-y-0.5">
          {alternatives.map((alt, idx) => (
            <AlternativeRow
              key={idx}
              alt={alt}
              onSpeak={onAlternativeSpeak}
              delay={800 + idx * 120}
              showCards={showCards}
            />
          ))}
        </div>
      )}

      {/* Detail cards */}
      {otherCards.map((card, idx) => (
        <DetailCard
          key={idx}
          type={card.type}
          title={card.title}
          items={card.items}
          text={card.text}
          delay={1100 + idx * 150}
          showCards={showCards}
        />
      ))}

      {/* Recommend/Caution detail (if has longer text) */}
      {recommendCard?.text && recommendCard.text.length > 20 && (
        <DetailCard
          type="recommend"
          title={recommendCard.title}
          text={recommendCard.text}
          items={recommendCard.items}
          delay={1300}
          showCards={showCards}
        />
      )}
      {cautionCard?.text && cautionCard.text.length > 20 && (
        <DetailCard
          type="caution"
          title={cautionCard.title}
          text={cautionCard.text}
          items={cautionCard.items}
          delay={1400}
          showCards={showCards}
        />
      )}

      {/* Example */}
      {example && example.source && example.target && (
        <ExampleCard example={example} delay={1500} showCards={showCards} />
      )}
    </div>
  );
});
UsageCards.displayName = "UsageCards";

// Example sentence card
const ExampleCard = memo(({
  example,
  delay = 0,
  showCards = false,
}: {
  example: UsageExample;
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

  return (
    <div
      className={cn(
        "rounded-xl bg-muted/30 px-3.5 py-2.5 transition-all duration-300",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      )}
    >
      <p className="text-[11px] text-muted-foreground/60 font-medium mb-1.5">📝</p>
      <p className="text-sm leading-relaxed">{example.source}</p>
      <p className="text-xs text-muted-foreground mt-1">{example.target}</p>
    </div>
  );
});
ExampleCard.displayName = "ExampleCard";
