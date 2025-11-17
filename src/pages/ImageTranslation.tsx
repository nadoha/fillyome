import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Loader2, Download } from "lucide-react";
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

const ImageTranslation = () => {
  const navigate = useNavigate();
  const [image, setImage] = useState<string | null>(null);
  const [translatedImage, setTranslatedImage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [sourceLang, setSourceLang] = useState<"ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr">("ja");
  const [targetLang, setTargetLang] = useState<"ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr">("ko");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
      setTranslatedImage(null);
    };
    reader.readAsDataURL(file);
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

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Draw translated text over each region
      textRegions.forEach((region) => {
        const x = region.x * img.width;
        const y = region.y * img.height;
        const width = region.width * img.width;
        const height = region.height * img.height;

        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x, y, width, height);

        // Calculate font size based on region height
        const fontSize = Math.max(12, Math.min(height * 0.6, 32));
        ctx.font = `${fontSize}px "Pretendard", -apple-system, sans-serif`;
        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Word wrap if text is too long
        const words = region.translated.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        words.forEach((word) => {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > width * 0.9) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);

        // Draw text lines
        const lineHeight = fontSize * 1.2;
        const totalHeight = lines.length * lineHeight;
        const startY = y + (height - totalHeight) / 2 + fontSize / 2;

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

  const handleSwapLanguages = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="container max-w-6xl mx-auto px-4 py-6">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로 가기
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">이미지 번역</h1>
          <p className="text-muted-foreground">이미지 속 텍스트를 인식하고 번역합니다</p>
        </div>

        <div className="space-y-6">
          {/* Language Selection */}
          <div className="flex items-center justify-center gap-2">
            <LanguageSelector
              value={sourceLang}
              onChange={(lang) => setSourceLang(lang as typeof sourceLang)}
              recentPairs={[]}
              type="source"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSwapLanguages}
              className="rounded-full"
            >
              <ArrowLeft className="h-4 w-4 rotate-180" />
            </Button>
            <LanguageSelector
              value={targetLang}
              onChange={(lang) => setTargetLang(lang as typeof targetLang)}
              recentPairs={[]}
              type="target"
            />
          </div>

          {/* Upload Section */}
          <div className="bg-card rounded-2xl shadow-lg p-6 border border-border/50">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {!image ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-64 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-4 hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <Upload className="h-12 w-12 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-lg font-medium">이미지 업로드</p>
                  <p className="text-sm text-muted-foreground mt-1">클릭하여 이미지를 선택하세요</p>
                </div>
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">원본 이미지</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    다른 이미지 선택
                  </Button>
                </div>
                <img src={image} alt="Original" className="w-full rounded-lg" />
                
                <Button
                  onClick={handleTranslate}
                  disabled={isTranslating}
                  className="w-full h-12"
                  size="lg"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
            <div className="bg-card rounded-2xl shadow-lg p-6 border border-border/50 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">번역 결과</h3>
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
              <img src={translatedImage} alt="Translated" className="w-full rounded-lg" />
            </div>
          )}

          {/* Hidden canvas for rendering */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </div>
  );
};

export default ImageTranslation;
