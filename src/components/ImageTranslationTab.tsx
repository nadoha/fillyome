import { useState, useRef, useEffect } from "react";
import { Upload, Loader2, Download, ArrowRight, Camera, X, ImagePlus } from "lucide-react";
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
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setIsCameraMode(true);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error("카메라에 접근할 수 없습니다");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraMode(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            processImageFile(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

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

  if (isCameraMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70"
          onClick={stopCamera}
        >
          <X className="h-6 w-6" />
        </Button>

        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex gap-2 mb-4">
            <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm text-center">
              {sourceLang === 'ko' ? '한국어' : sourceLang === 'ja' ? '日本語' : sourceLang === 'en' ? 'English' : sourceLang === 'zh' ? '中文' : sourceLang}
            </div>
            <ArrowRight className="h-5 w-5 text-white mt-2" />
            <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm text-center">
              {targetLang === 'ko' ? '한국어' : targetLang === 'ja' ? '日本語' : targetLang === 'en' ? 'English' : targetLang === 'zh' ? '中文' : targetLang}
            </div>
          </div>
          
          <Button
            onClick={capturePhoto}
            className="w-full h-14 rounded-full bg-white text-black hover:bg-white/90 font-semibold"
          >
            <Camera className="mr-2 h-5 w-5" />
            촬영
          </Button>
        </div>
      </div>
    );
  }

  const clearImage = () => {
    setImage(null);
    setTranslatedImage(null);
    setShowOriginal(false);
  };

  // Get the displayed image (translated or original based on toggle)
  const displayedImage = translatedImage && !showOriginal ? translatedImage : image;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Initial Upload State - Clean and prominent */}
      {!image ? (
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
          {/* Main Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative w-full min-h-[280px] border-2 border-dashed rounded-xl m-4 mb-2 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
          >
            <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center px-4">
              <p className="text-base font-medium text-foreground mb-1">
                이미지를 업로드하세요
              </p>
              <p className="text-sm text-muted-foreground">
                드래그 앤 드롭, 클릭, 또는 <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+V</kbd>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="px-4 pb-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={(e) => {
                e.stopPropagation();
                startCamera();
              }}
            >
              <Camera className="mr-2 h-4 w-4" />
              카메라로 촬영
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              <Upload className="mr-2 h-4 w-4" />
              파일 선택
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
          {/* Language Selector */}
          <div className="p-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <LanguageSelector
                  value={sourceLang}
                  onChange={onSourceLangChange}
                  recentPairs={recentPairs}
                  type="source"
                />
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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

          {/* Image Preview with Overlay */}
          <div className="relative">
            <img 
              src={displayedImage || image} 
              alt={translatedImage && !showOriginal ? "Translated" : "Original"} 
              className="w-full max-h-[45vh] object-contain bg-muted/20" 
            />
            
            {/* Top Controls */}
            <div className="absolute top-2 right-2 flex gap-1.5">
              {translatedImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-3 bg-background/90 backdrop-blur-sm hover:bg-background text-xs font-medium"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  {showOriginal ? "번역 보기" : "원본 보기"}
                </Button>
              )}
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/90 backdrop-blur-sm hover:bg-background"
                onClick={clearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Translation Status Badge */}
            {translatedImage && !showOriginal && (
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  번역됨
                </span>
              </div>
            )}

            {/* Loading Overlay */}
            {isTranslating && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm font-medium">번역 중...</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Bottom Action Bar */}
          <div className="p-3 border-t border-border/50 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              다른 이미지
            </Button>
            
            {translatedImage ? (
              <Button
                size="sm"
                className="flex-[2]"
                onClick={handleDownload}
              >
                <Download className="mr-1.5 h-4 w-4" />
                번역 이미지 저장
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleTranslate}
                disabled={isTranslating}
                className="flex-[2]"
              >
                번역하기
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Hidden canvas for rendering */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
