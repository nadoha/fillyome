import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MessageSquare, Volume2, Lightbulb, AlertTriangle } from "lucide-react";

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
}

const cardIcons: Record<string, React.ElementType> = {
  situation: MessageSquare,
  tone: Volume2,
  recommend: Lightbulb,
  caution: AlertTriangle,
};

const cardColors: Record<string, string> = {
  situation: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  tone: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  recommend: "bg-green-500/10 text-green-700 dark:text-green-300",
  caution: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

export const UsageCards = memo(({
  alternatives = [],
  usageCards = [],
  example,
  onAlternativeSpeak,
}: UsageCardsProps) => {
  // Don't render anything if no cards or alternatives
  const hasContent = alternatives.length > 0 || usageCards.length > 0 || example;
  if (!hasContent) return null;

  return (
    <div className="mt-4 space-y-3 animate-fade-in">
      {/* Alternatives Section */}
      {alternatives.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">비슷한 표현</p>
          <div className="flex flex-wrap gap-2">
            {alternatives.map((alt, idx) => (
              <Card
                key={idx}
                className="px-3 py-2 bg-muted/40 border-border/50 hover:bg-muted/60 transition-colors cursor-pointer group"
                onClick={() => onAlternativeSpeak?.(alt.text)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{alt.text}</span>
                  <Volume2 className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  {alt.tags.map((tag, tagIdx) => (
                    <Badge
                      key={tagIdx}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                {alt.note && (
                  <p className="text-[10px] text-muted-foreground mt-1">{alt.note}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Usage Context Cards */}
      {usageCards.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {usageCards.map((card, idx) => {
            const Icon = cardIcons[card.type] || MessageSquare;
            const colorClass = cardColors[card.type] || cardColors.situation;

            return (
              <Card
                key={idx}
                className={`px-3 py-2 border-0 ${colorClass}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3 w-3" />
                  <span className="text-xs font-semibold">{card.title}</span>
                </div>
                {card.items && card.items.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {card.items.map((item, itemIdx) => (
                      <Badge
                        key={itemIdx}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 h-4 border-current/30"
                      >
                        {item}
                      </Badge>
                    ))}
                  </div>
                )}
                {card.text && (
                  <p className="text-xs leading-relaxed">{card.text}</p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Example Section */}
      {example && example.source && example.target && (
        <Card className="px-3 py-2 bg-muted/30 border-border/50">
          <p className="text-xs text-muted-foreground font-medium mb-1.5">예문</p>
          <p className="text-sm">{example.source}</p>
          <p className="text-xs text-muted-foreground mt-1">{example.target}</p>
        </Card>
      )}
    </div>
  );
});

UsageCards.displayName = "UsageCards";
