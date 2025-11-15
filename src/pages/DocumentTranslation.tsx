import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Link as LinkIcon, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LanguageSelector } from "@/components/LanguageSelector";
import { TranslationResultBox } from "@/components/TranslationResultBox";

export default function DocumentTranslation() {
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sourceLang, setSourceLang] = useState<"ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr">("ko");
  const [targetLang, setTargetLang] = useState<"ko" | "ja" | "en" | "zh" | "es" | "fr" | "de" | "pt" | "it" | "ru" | "ar" | "th" | "vi" | "id" | "hi" | "tr">("ja");

  const handleUrlScrape = async () => {
    if (!url.trim()) {
      toast.error("URL을 입력해주세요");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('scrape-url', {
        body: { url }
      });

      if (error) throw error;

      if (data.success) {
        setSourceText(data.text);
        toast.success("웹 페이지를 성공적으로 불러왔습니다");
        await translateLongText(data.text);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('URL scraping error:', error);
      toast.error("페이지를 불러오는데 실패했습니다: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsLoading(true);

    try {
      const text = await readFileContent(selectedFile);
      setSourceText(text);
      toast.success("파일을 성공적으로 불러왔습니다");
      await translateLongText(text);
    } catch (error: any) {
      console.error('File reading error:', error);
      toast.error("파일을 읽는데 실패했습니다: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  };

  const translateLongText = async (text: string) => {
    if (!text.trim()) {
      toast.error("번역할 텍스트가 없습니다");
      return;
    }

    setIsLoading(true);
    setTranslatedText("");

    try {
      // Split text into chunks of ~2000 characters
      const chunkSize = 2000;
      const chunks: string[] = [];
      
      for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
      }

      console.log(`Translating ${chunks.length} chunks...`);
      toast.info(`${chunks.length}개의 구간으로 나누어 번역합니다...`);

      let fullTranslation = "";

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        const { data, error } = await supabase.functions.invoke('translate', {
          body: {
            text: chunk,
            sourceLang,
            targetLang
          }
        });

        if (error) throw error;

        if (data.translation) {
          fullTranslation += data.translation + "\n\n";
          setTranslatedText(fullTranslation);
          toast.success(`${i + 1}/${chunks.length} 구간 번역 완료`);
        }

        // Small delay between requests to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      toast.success("전체 번역이 완료되었습니다!");
    } catch (error: any) {
      console.error('Translation error:', error);
      toast.error("번역 중 오류가 발생했습니다: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                문서 번역
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <Card className="p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-center gap-3">
            <LanguageSelector
              value={sourceLang}
              onChange={(value: string) => setSourceLang(value as typeof sourceLang)}
              recentPairs={[]}
              type="source"
            />
            <ArrowLeft className="h-5 w-5 text-muted-foreground rotate-180" />
            <LanguageSelector
              value={targetLang}
              onChange={(value: string) => setTargetLang(value as typeof targetLang)}
              recentPairs={[]}
              type="target"
            />
          </div>

          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                URL 번역
              </TabsTrigger>
              <TabsTrigger value="file" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                파일 번역
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="url">웹 페이지 URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUrlScrape}
                    disabled={isLoading}
                    className="min-w-[100px]"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        불러오는 중...
                      </>
                    ) : (
                      "번역하기"
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="file" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="file">파일 선택 (TXT, MD, JSON 등)</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".txt,.md,.json,.csv,.xml"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    선택된 파일: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {(sourceText || translatedText) && (
            <div className="mt-8 space-y-6">
              {sourceText && (
                <div className="space-y-2">
                  <Label>원본 텍스트</Label>
                  <Textarea
                    value={sourceText}
                    readOnly
                    className="min-h-[200px] max-h-[600px] resize-none overflow-y-auto"
                  />
                </div>
              )}

              {translatedText && (
                <div className="space-y-2">
                  <Label>번역 결과</Label>
                  <TranslationResultBox
                    naturalTranslation={translatedText}
                    isTranslating={isLoading}
                    onCopy={() => {
                      navigator.clipboard.writeText(translatedText);
                      toast.success("복사되었습니다");
                    }}
                    onSpeak={() => {
                      const utterance = new SpeechSynthesisUtterance(translatedText);
                      utterance.lang = targetLang;
                      speechSynthesis.speak(utterance);
                    }}
                    sourceText={sourceText}
                    sourceLang={sourceLang}
                    targetLang={targetLang}
                  />
                </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}
