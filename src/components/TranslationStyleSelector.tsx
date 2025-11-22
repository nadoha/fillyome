import { memo } from "react";
import { Button } from "@/components/ui/button";

export interface TranslationStyle {
  formality: "formal" | "informal";
  domain: "casual" | "business" | "academic";
  translationType: "literal" | "natural";
}


interface TranslationStyleSelectorProps {
  selectedStyle: TranslationStyle;
  onStyleChange: (style: TranslationStyle) => void;
}

export const TranslationStyleSelector = memo(({
  selectedStyle,
  onStyleChange,
}: TranslationStyleSelectorProps) => {
  const handleToggle = (formality: "formal" | "informal") => {
    onStyleChange({ 
      ...selectedStyle, 
      formality,
      domain: "casual",
      translationType: "natural"
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={selectedStyle.formality === "formal" ? "default" : "outline"}
        size="sm"
        onClick={() => handleToggle("formal")}
        className="flex-1 h-9"
      >
        격식체
      </Button>
      <Button
        variant={selectedStyle.formality === "informal" ? "default" : "outline"}
        size="sm"
        onClick={() => handleToggle("informal")}
        className="flex-1 h-9"
      >
        반말체
      </Button>
    </div>
  );
});

TranslationStyleSelector.displayName = "TranslationStyleSelector";
