import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

export interface TranslationStyle {
  formality: "formal" | "informal";
  domain: "casual" | "business" | "academic";
  translationType: "literal" | "natural";
}

export interface StylePreset {
  id: string;
  label: string;
  icon: string;
  style: TranslationStyle;
}

const PRESETS: StylePreset[] = [
  {
    id: "friend",
    label: "친구에게",
    icon: "💬",
    style: { formality: "informal", domain: "casual", translationType: "natural" }
  },
  {
    id: "business",
    label: "업무",
    icon: "💼",
    style: { formality: "formal", domain: "business", translationType: "natural" }
  },
  {
    id: "polite",
    label: "정중하게",
    icon: "🙏",
    style: { formality: "formal", domain: "casual", translationType: "natural" }
  },
  {
    id: "academic",
    label: "학술",
    icon: "📚",
    style: { formality: "formal", domain: "academic", translationType: "literal" }
  }
];

interface TranslationStyleSelectorProps {
  selectedStyle: TranslationStyle;
  onStyleChange: (style: TranslationStyle) => void;
  recommendedPreset?: string;
  onApplyRecommendation?: () => void;
}

export const TranslationStyleSelector = ({
  selectedStyle,
  onStyleChange,
  recommendedPreset,
  onApplyRecommendation
}: TranslationStyleSelectorProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handlePresetClick = (preset: StylePreset) => {
    onStyleChange(preset.style);
  };

  const handleStyleUpdate = (key: keyof TranslationStyle, value: string) => {
    onStyleChange({ ...selectedStyle, [key]: value });
  };

  const currentPreset = PRESETS.find(
    p => JSON.stringify(p.style) === JSON.stringify(selectedStyle)
  );

  const recommendedPresetObj = PRESETS.find(p => p.id === recommendedPreset);

  return (
    <div className="space-y-3">
      {/* AI Recommendation */}
      {recommendedPreset && recommendedPresetObj && !currentPreset && (
        <Card className="p-3 bg-accent/20 border-accent">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm">
                <span className="font-semibold">{recommendedPresetObj.icon} {recommendedPresetObj.label}</span>
                <span className="text-muted-foreground ml-1">추천</span>
              </span>
            </div>
            <Button
              size="sm"
              variant="default"
              onClick={onApplyRecommendation}
              className="h-7 text-xs"
            >
              적용
            </Button>
          </div>
        </Card>
      )}

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const isSelected = JSON.stringify(preset.style) === JSON.stringify(selectedStyle);
          const isRecommended = preset.id === recommendedPreset;
          
          return (
            <Button
              key={preset.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handlePresetClick(preset)}
              className="relative h-9"
            >
              <span className="mr-1">{preset.icon}</span>
              {preset.label}
              {isRecommended && !isSelected && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center" variant="default">
                  <Sparkles className="h-3 w-3" />
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Advanced Settings Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="w-full justify-between text-muted-foreground hover:text-foreground"
      >
        <span className="text-sm">세부 설정</span>
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <div className="space-y-3 pt-2 border-t">
          <div className="space-y-2">
            <label className="text-sm font-medium">격식</label>
            <Select
              value={selectedStyle.formality}
              onValueChange={(value) => handleStyleUpdate("formality", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">존댓말 (격식체)</SelectItem>
                <SelectItem value="informal">반말 (비격식체)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">분야</label>
            <Select
              value={selectedStyle.domain}
              onValueChange={(value) => handleStyleUpdate("domain", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="casual">일상</SelectItem>
                <SelectItem value="business">비즈니스</SelectItem>
                <SelectItem value="academic">학술</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">번역 방식</label>
            <Select
              value={selectedStyle.translationType}
              onValueChange={(value) => handleStyleUpdate("translationType", value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="natural">의역 중심 (자연스러움)</SelectItem>
                <SelectItem value="literal">직역 중심 (정확성)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
};
