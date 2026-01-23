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
  onStyleChange
}: TranslationStyleSelectorProps) => {
  const handleFormalityToggle = (checked: boolean) => {
    onStyleChange({
      ...selectedStyle,
      formality: checked ? "formal" : "informal"
    });
  };
  const handleTranslationTypeToggle = (checked: boolean) => {
    onStyleChange({
      ...selectedStyle,
      translationType: checked ? "natural" : "literal"
    });
  };
  return <div className="flex items-center justify-start gap-4">
      
      
      
    </div>;
});
TranslationStyleSelector.displayName = "TranslationStyleSelector";