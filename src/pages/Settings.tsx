import { ArrowLeft, Volume2, Mic, Database, Globe, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { toast } from "sonner";

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
    const keys = Object.keys(localStorage).filter(k => k.startsWith('tr_'));
    keys.forEach(k => localStorage.removeItem(k));
    toast.success(t("cacheCleared") || "캐시가 삭제되었습니다");
  };

  const clearHistory = () => {
    localStorage.removeItem('translations');
    toast.success(t("historyCleared") || "번역 기록이 삭제되었습니다");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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

      <main className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-32 space-y-5 sm:space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              {t("voiceSettings") || "음성 설정"}
            </CardTitle>
            <CardDescription>
              {t("voiceSettingsDesc") || "음성 인식 및 TTS 설정을 관리합니다"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="noise-cancel">{t("noiseCancellation") || "노이즈 캔슬링"}</Label>
                <p className="text-sm text-muted-foreground">
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sound-effects">{t("soundEffects") || "효과음"}</Label>
                <p className="text-sm text-muted-foreground">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("dataSettings") || "데이터 설정"}
            </CardTitle>
            <CardDescription>
              {t("dataSettingsDesc") || "번역 기록 및 캐시를 관리합니다"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-save">{t("autoSave") || "자동 저장"}</Label>
                <p className="text-sm text-muted-foreground">
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
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={clearCache}
              >
                {t("clearCache") || "캐시 삭제"}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={clearHistory}
              >
                {t("clearHistory") || "번역 기록 삭제"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t("languageSettings") || "언어 설정"}
            </CardTitle>
            <CardDescription>
              {t("languageSettingsDesc") || "앱 표시 언어를 변경합니다"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>{t("appLanguage") || "앱 언어"}</Label>
              <div className="grid grid-cols-2 gap-2">
                {["ko", "ja", "en", "zh"].map((lang) => (
                  <Button
                    key={lang}
                    variant={i18n.language === lang ? "default" : "outline"}
                    className="w-full"
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
  );
}
