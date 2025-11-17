import { useState, useRef, useEffect } from "react";
import { Upload, Loader2, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TextRegion {
  original: string;
  translated: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageTranslationTabProps {
  sourceLang: "ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr";
  targetLang: "ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr";
  onSourceLangChange: (lang: "ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr") => void;
  onTargetLangChange: (lang: "ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr") => void;
  recentPairs: Array<{source: string, target: string}>;
}

export const ImageTranslationTab = ({
  sourceLang,
  targetLang,
  onSourceLangChange,
  onTargetLangChange,
  recentPairs
}: ImageTranslationTabProps) => {
  const [image, setImage] = useState<string | null>(null);
  const [translatedImage, setTranslatedImage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            toast.success("이미지가 붙여넣기되었습니다");
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setTranslatedImage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    processImageFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if we're leaving the drop zone itself, not child elements
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) {
      toast.error("파일을 찾을 수 없습니다");
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    processImageFile(file);
    toast.success("이미지가 업로드되었습니다");
  };

  const drawTranslatedImage = (imageDataUrl: string, textRegions: TextRegion[]) => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      textRegions.forEach((region) => {
        const x = region.x * img.width;
        const y = region.y * img.height;
        const width = region.width * img.width;
        const height = region.height * img.height;

        // Calculate font size - compact and clean
        const fontSize = Math.max(10, Math.min(height * 0.5, 24));
        ctx.font = `500 ${fontSize}px "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif`;
        
        const words = region.translated.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach((word) => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > width * 0.88) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);

        const lineHeight = fontSize * 1.2;
        const totalTextHeight = lines.length * lineHeight;
        const padding = 4;
        const boxHeight = totalTextHeight + padding * 2;

        // Draw background box with subtle shadow - directly on original text position
        ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
        ctx.fillRect(x, y, width, Math.min(boxHeight, height));
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        // Draw text
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const startY = y + padding;
        lines.forEach((line, i) => {
          ctx.fillText(line, x + width / 2, startY + i * lineHeight);
        });
      });

      setTranslatedImage(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
  };

  const handleTranslate = async () => {
    if (!image) {
      toast.error("이미지를 먼저 업로드해주세요");
      return;
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke('image-translate', {
        body: {
          imageBase64: image,
          sourceLang,
          targetLang,
        },
      });

      if (error) throw error;

      if (data?.textRegions && Array.isArray(data.textRegions)) {
        drawTranslatedImage(image, data.textRegions);
        toast.success("번역이 완료되었습니다");
      } else {
        toast.error("텍스트를 찾을 수 없습니다");
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error(error.message || "번역에 실패했습니다");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownload = () => {
    if (!translatedImage) return;

    const link = document.createElement('a');
    link.href = translatedImage;
    link.download = `translated-${Date.now()}.png`;
    link.click();
    toast.success("이미지가 다운로드되었습니다");
  };

  return (
    <div className="space-y-4">
      {/* Language Selector */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <LanguageSelector
              value={sourceLang}
              onChange={onSourceLangChange}
              recentPairs={recentPairs}
              type="source"
              showAutoDetect={true}
            />
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <LanguageSelector
              value={targetLang}
              onChange={onTargetLangChange}
              recentPairs={recentPairs}
              type="target"
            />
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-card rounded-xl shadow-sm p-4 border border-border/50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {!image ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer ${
              isDragging 
                ? 'border-primary bg-primary/10' 
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-center pointer-events-none">
              <p className="font-medium">이미지 업로드</p>
              <p className="text-sm text-muted-foreground mt-1">
                클릭하여 선택, 드래그 앤 드롭 또는<br />
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Ctrl+V</kbd>로 붙여넣기
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">원본 이미지</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                다른 이미지 선택
              </Button>
            </div>
            <img src={image} alt="Original" className="w-full max-h-[400px] object-contain rounded-lg bg-muted/30" />
            
            <Button
              onClick={handleTranslate}
              disabled={isTranslating}
              className="w-full h-11"
            >
              {isTranslating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  번역 중...
                </>
              ) : (
                "번역하기"
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Translated Image Result */}
      {translatedImage && (
        <div className="bg-card rounded-xl shadow-sm p-4 border border-border/50 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">번역 결과</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              다운로드
            </Button>
          </div>
          <img src={translatedImage} alt="Translated" className="w-full max-h-[400px] object-contain rounded-lg bg-muted/30" />
        </div>
      )}

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
