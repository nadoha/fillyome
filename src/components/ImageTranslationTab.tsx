import { useState, useRef, useEffect } from "react";
import { Upload, Loader2, Download, ArrowRight, Camera, X, ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
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
  fontSize?: number;
  bgColor?: string;
  isDarkBg?: boolean;
  textAlign?: 'left' | 'center' | 'right';
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
  const { t } = useTranslation();
  const [image, setImage] = useState<string | null>(null);
  const [translatedImage, setTranslatedImage] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            processImageFile(file);
            toast.success(t("imagePasted"));
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [t]);

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
      toast.error(t("cameraAccessFailed"));
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
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.9);
      setImage(imageData);
      stopCamera();
    }
  };

  const processImageFile = (file: File) => {
    const maxSize = 4 * 1024 * 1024;
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (file.size > maxSize) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDimension = 1920;
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          setImage(canvas.toDataURL('image/jpeg', 0.85));
          setTranslatedImage(null);
        };
        img.src = result;
      } else {
        setImage(result);
        setTranslatedImage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t("imageOnlyUpload"));
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
      toast.error(t("fileNotFound"));
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t("imageOnlyUpload"));
      return;
    }

    processImageFile(file);
    toast.success(t("imageUploaded"));
  };

  const drawTranslatedImage = (imageDataUrl: string, textRegions: TextRegion[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(img, 0, 0);

      textRegions.forEach(region => {
        // Background
        const bgColor = region.bgColor || '#ffffff';
        ctx.fillStyle = bgColor;
        const padding = 4;
        ctx.fillRect(
          region.x - padding, 
          region.y - padding, 
          region.width + padding * 2, 
          region.height + padding * 2
        );

        // Text
        const fontSize = region.fontSize || Math.max(12, Math.min(region.height * 0.7, 48));
        ctx.font = `bold ${fontSize}px "Noto Sans KR", "Noto Sans JP", sans-serif`;
        ctx.fillStyle = region.isDarkBg ? '#ffffff' : '#000000';
        ctx.textAlign = region.textAlign || 'center';
        ctx.textBaseline = 'middle';

        const centerX = region.x + region.width / 2;
        const centerY = region.y + region.height / 2;

        // Word wrap
        const words = region.translated.split('');
        let lines: string[] = [];
        let currentLine = '';

        for (const char of words) {
          const testLine = currentLine + char;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > region.width - padding * 2 && currentLine) {
            lines.push(currentLine);
            currentLine = char;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);

        const lineHeight = fontSize * 1.2;
        const startY = centerY - (lines.length - 1) * lineHeight / 2;

        lines.forEach((line, i) => {
          ctx.fillText(line, centerX, startY + i * lineHeight);
        });
      });

      setTranslatedImage(canvas.toDataURL('image/png'));
      setShowOriginal(false);
    };
    img.src = imageDataUrl;
  };

  const handleTranslate = async () => {
    if (!image) {
      toast.error(t("uploadImageFirst"));
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
        toast.success(t("translationComplete"));
      } else {
        toast.error(t("textNotFound"));
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error(error.message || t("translationFailed"));
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
    toast.success(t("imageDownloaded"));
  };

  // i18n helper for language display in camera mode
  const getLangDisplay = (code: string) => {
    return t(code === 'ko' ? 'korean' : code === 'ja' ? 'japanese' : code === 'en' ? 'english' : code === 'zh' ? 'chinese' : code);
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
              {getLangDisplay(sourceLang)}
            </div>
            <ArrowRight className="h-5 w-5 text-white mt-2" />
            <div className="flex-1 bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm text-center">
              {getLangDisplay(targetLang)}
            </div>
          </div>
          
          <Button
            onClick={capturePhoto}
            className="w-full h-14 rounded-full bg-white text-black hover:bg-white/90 font-semibold"
          >
            <Camera className="mr-2 h-5 w-5" />
            {t("imageTranslation")}
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

      {!image ? (
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
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
                {t("imageTranslation")}
              </p>
              <p className="text-sm text-muted-foreground">
                Drag & Drop · Click · <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+V</kbd>
              </p>
            </div>
          </div>

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
              📷
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
              📁
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl shadow-sm border border-border/50 overflow-hidden">
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

          <div className="relative">
            <img 
              src={displayedImage || image} 
              alt={translatedImage && !showOriginal ? "Translated" : "Original"} 
              className="w-full max-h-[45vh] object-contain bg-muted/20" 
            />
            
            <div className="absolute top-2 right-2 flex gap-1.5">
              {translatedImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 px-3 bg-background/90 backdrop-blur-sm hover:bg-background text-xs font-medium"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  {showOriginal ? "🔄" : "📄"}
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

            {translatedImage && !showOriginal && (
              <div className="absolute top-2 left-2">
                <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                  ✓
                </span>
              </div>
            )}

            {isTranslating && (
              <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm font-medium">{t("translating")}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-border/50 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              📁
            </Button>
            
            {translatedImage ? (
              <Button
                size="sm"
                className="flex-[2]"
                onClick={handleDownload}
              >
                <Download className="mr-1.5 h-4 w-4" />
                💾
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleTranslate}
                disabled={isTranslating}
                className="flex-[2]"
              >
                {t("translate")}
              </Button>
            )}
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};