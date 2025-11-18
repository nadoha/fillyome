import { ArrowLeft, Volume2, Mic, Database, Globe, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { cleanAllCaches, getCacheStats, clearTranslationCache } from "@/utils/cacheManager";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [noiseCancellation, setNoiseCancellation] = useState(() => {
    const saved = localStorage.getItem('noiseCancellation');
    return saved ? JSON.parse(saved) : true;
  });
  const [autoSave, setAutoSave] = useState(() => {
    const saved = localStorage.getItem('autoSave');
    return saved ? JSON.parse(saved) : true;
  });
  const [soundEffects, setSoundEffects] = useState(() => {
    const saved = localStorage.getItem('soundEffects');
    return saved ? JSON.parse(saved) : true;
  });

  const handleNoiseCancellation = (checked: boolean) => {
    setNoiseCancellation(checked);
    localStorage.setItem('noiseCancellation', JSON.stringify(checked));
    toast.success(checked ? t("noiseCancelOn") : t("noiseCancelOff"));
  };

  const handleAutoSave = (checked: boolean) => {
    setAutoSave(checked);
    localStorage.setItem('autoSave', JSON.stringify(checked));
    toast.success(checked ? t("autoSaveOn") : t("autoSaveOff"));
  };

  const handleSoundEffects = (checked: boolean) => {
    setSoundEffects(checked);
    localStorage.setItem('soundEffects', JSON.stringify(checked));
    toast.success(checked ? t("soundOn") : t("soundOff"));
  };

  const clearCache = () => {
    const count = clearTranslationCache();
    toast.success(`${count}개의 번역 캐시가 삭제되었습니다`);
  };

  const optimizeCache = () => {
    cleanAllCaches();
    const stats = getCacheStats();
    toast.success(`캐시 최적화 완료 (총 ${stats.total}개 항목)`);
  };

  const clearHistory = () => {
    localStorage.removeItem('translations');
    toast.success(t("historyCleared") || "번역 기록이 삭제되었습니다");
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 pb-20 md:pb-0">
        <header className="border-b bg-card/95 backdrop-blur-lg sticky top-0 z-10 shadow-sm">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="rounded-full h-10 w-10 sm:h-11 sm:w-11 shrink-0"
                aria-label={t("back") || "뒤로가기"}
              >
                <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
              </Button>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                {t("settings") || "설정"}
              </h1>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 144px)' }}>
          <Card className="shadow-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                {t("voiceSettings") || "음성 설정"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("voiceSettingsDesc") || "음성 인식 및 TTS 설정을 관리합니다"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="noise-cancel" className="text-sm">{t("noiseCancellation") || "노이즈 캔슬링"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("noiseCancelDesc") || "배경 소음을 제거하여 정확도를 높입니다"}
                  </p>
                </div>
                <Switch
                  id="noise-cancel"
                  checked={noiseCancellation}
                  onCheckedChange={handleNoiseCancellation}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="sound-effects" className="text-sm">{t("soundEffects") || "효과음"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("soundEffectsDesc") || "버튼 클릭 및 알림 소리를 켭니다"}
                  </p>
                </div>
                <Switch
                  id="sound-effects"
                  checked={soundEffects}
                  onCheckedChange={handleSoundEffects}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                {t("dataSettings") || "데이터 설정"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("dataSettingsDesc") || "번역 기록 및 캐시를 관리합니다"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1">
                  <Label htmlFor="auto-save" className="text-sm">{t("autoSave") || "자동 저장"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("autoSaveDesc") || "번역 결과를 자동으로 저장합니다"}
                  </p>
                </div>
                <Switch
                  id="auto-save"
                  checked={autoSave}
                  onCheckedChange={handleAutoSave}
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-9 text-sm"
                  onClick={optimizeCache}
                >
                  <Database className="h-4 w-4 mr-2" />
                  {t("optimizeCache") || "캐시 최적화"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-9 text-sm"
                  onClick={clearCache}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("clearCache") || "번역 캐시 삭제"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive h-9 text-sm"
                  onClick={clearHistory}
                >
                  {t("clearHistory") || "번역 기록 삭제"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                {t("languageSettings") || "언어 설정"}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {t("languageSettingsDesc") || "앱 표시 언어를 변경합니다"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm">{t("appLanguage") || "앱 언어"}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["ko", "ja", "en", "zh"].map((lang) => (
                    <Button
                      key={lang}
                      variant={i18n.language === lang ? "default" : "outline"}
                      size="sm"
                      className="w-full h-9 text-sm"
                      onClick={() => {
                        i18n.changeLanguage(lang);
                        toast.success(t("languageChanged") || "언어가 변경되었습니다");
                      }}
                    >
                      {lang === "ko" && t("korean")}
                      {lang === "ja" && t("japanese")}
                      {lang === "en" && t("english")}
                      {lang === "zh" && t("chinese")}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
      <BottomNavigation />
    </>
  );
}
