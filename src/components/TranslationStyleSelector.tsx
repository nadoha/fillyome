import { memo } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

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
  const handleToggle = (checked: boolean) => {
    onStyleChange({ 
      ...selectedStyle, 
      formality: checked ? "formal" : "informal",
      domain: "casual",
      translationType: "natural"
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="formality-toggle" className="text-sm font-medium">
        {selectedStyle.formality === "formal" ? "격식체" : "반말체"}
      </Label>
      <Switch
        id="formality-toggle"
        checked={selectedStyle.formality === "formal"}
        onCheckedChange={handleToggle}
      />
    </div>
  );
});

TranslationStyleSelector.displayName = "TranslationStyleSelector";
