import { useState, useEffect } from "react";
import { ArrowLeft, Volume2, Mic, Database, Globe, Trash2, User, LogOut, ChevronRight, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { BottomNavigation } from "@/components/BottomNavigation";
import { cleanAllCaches, getCacheStats, clearTranslationCache } from "@/utils/cacheManager";

export default function Settings() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  
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
  
  // 학습 기록 저장 설정 (기본 OFF) - DB에서 로드
  const [saveTranslationHistory, setSaveTranslationHistory] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoadingUser(false);
      
      // 로그인한 사용자면 DB에서 설정 로드
      if (user) {
        loadUserSettings(user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserSettings(session.user.id);
      } else {
        setSaveTranslationHistory(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);
  
  const loadUserSettings = async (userId: string) => {
    setIsLoadingSettings(true);
    try {
      const { data, error } = await supabase
        .from("learning_settings")
        .select("save_translation_history")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (data) {
        setSaveTranslationHistory(data.save_translation_history || false);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setIsLoadingSettings(false);
    }
  };
  
  const handleSaveTranslationHistory = async (checked: boolean) => {
    setSaveTranslationHistory(checked);
    
    if (user) {
      try {
        // Upsert 설정
        const { error } = await supabase
          .from("learning_settings")
          .upsert({
            user_id: user.id,
            save_translation_history: checked
          }, { onConflict: 'user_id' });
        
        if (error) throw error;
        
        toast.success(checked 
          ? "번역 기록이 저장됩니다" 
          : "번역 기록이 저장되지 않습니다"
        );
      } catch (error) {
        console.error("Failed to update setting:", error);
        toast.error("설정 저장 실패");
        setSaveTranslationHistory(!checked); // Revert
      }
    } else {
      toast.info("로그인 후 사용할 수 있는 기능입니다");
      setSaveTranslationHistory(false);
    }
  };

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃 되었습니다");
  };

  return (
    <>
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <header className="border-b bg-background sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-5 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="-ml-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-xl font-semibold">설정</h1>
            </div>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-5 py-6 space-y-6">
          {/* Account Section */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">계정</h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                {isLoadingUser ? (
                  <div className="p-4 text-sm text-muted-foreground">불러오는 중...</div>
                ) : user ? (
                  <>
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.email}</p>
                          <p className="text-xs text-muted-foreground">Google 계정 연결됨</p>
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-12 px-4 text-sm text-muted-foreground hover:text-destructive"
                      onClick={handleLogout}
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      로그아웃
                    </Button>
                  </>
                ) : (
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => navigate("/auth")}
                  >
                    <div>
                      <p className="text-sm font-medium">Google 계정 연결 (선택)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        다른 기기에서 학습 기록을 이어갈 수 있어요
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Voice Settings */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">음성</h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">노이즈 캔슬링</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      배경 소음을 제거하여 정확도를 높입니다
                    </p>
                  </div>
                  <Switch
                    checked={noiseCancellation}
                    onCheckedChange={handleNoiseCancellation}
                  />
                </div>
                <Separator />
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">효과음</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      버튼 클릭 및 알림 소리
                    </p>
                  </div>
                  <Switch
                    checked={soundEffects}
                    onCheckedChange={handleSoundEffects}
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Privacy Settings - 개인정보 보호 섹션 우선 배치 */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              개인정보 보호
            </h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                <div className="p-4 flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <p className="text-sm font-medium">학습 기록 저장</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {user 
                        ? "켜면 번역 기록을 저장하여 맞춤 학습에 활용합니다. 기록은 본인만 열람 가능합니다."
                        : "로그인 후 사용할 수 있습니다"
                      }
                    </p>
                  </div>
                  <Switch
                    checked={saveTranslationHistory}
                    onCheckedChange={handleSaveTranslationHistory}
                    disabled={!user || isLoadingSettings}
                  />
                </div>
                {saveTranslationHistory && user && (
                  <>
                    <Separator />
                    <div className="p-4 bg-muted/30">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        ✓ 번역 기록은 암호화되어 저장됩니다<br/>
                        ✓ 운영자는 비식별화된 통계만 접근 가능합니다<br/>
                        ✓ 언제든 이 설정을 끄거나 기록을 삭제할 수 있습니다
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Data Settings */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">데이터</h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-0">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">자동 저장</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      번역 결과를 자동으로 저장합니다
                    </p>
                  </div>
                  <Switch
                    checked={autoSave}
                    onCheckedChange={handleAutoSave}
                  />
                </div>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 px-4 text-sm"
                  onClick={optimizeCache}
                >
                  캐시 최적화
                </Button>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 px-4 text-sm"
                  onClick={clearCache}
                >
                  번역 캐시 삭제
                </Button>
                <Separator />
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12 px-4 text-sm text-destructive hover:text-destructive"
                  onClick={clearHistory}
                >
                  번역 기록 삭제
                </Button>
              </CardContent>
            </Card>
          </section>

          {/* Language Settings */}
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">언어</h2>
            <Card className="border-border shadow-none">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-3">앱 표시 언어</p>
                <div className="grid grid-cols-2 gap-2">
                  {["ko", "ja", "en", "zh"].map((lang) => (
                    <Button
                      key={lang}
                      variant={i18n.language === lang ? "default" : "outline"}
                      size="sm"
                      className="h-10"
                      onClick={() => {
                        i18n.changeLanguage(lang);
                        toast.success("언어가 변경되었습니다");
                      }}
                    >
                      {lang === "ko" && "한국어"}
                      {lang === "ja" && "日本語"}
                      {lang === "en" && "English"}
                      {lang === "zh" && "中文"}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Privacy notice */}
          <p className="text-xs text-muted-foreground text-center pt-2 leading-relaxed">
            이 앱은 번역 및 학습 서비스 제공을 위해<br />
            최소한의 데이터만 수집합니다
          </p>
        </main>
      </div>
      <BottomNavigation />
    </>
  );
}
