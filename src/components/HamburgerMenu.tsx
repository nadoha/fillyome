import { Menu, LogIn, LogOut, Moon, Sun, Settings, User as UserIcon, FileText, BookOpen, BookMarked, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface HamburgerMenuProps {
  user: User | null;
  onUserChange: (user: User | null) => void;
}

export const HamburgerMenu = ({ user, onUserChange }: HamburgerMenuProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success(t("logoutSuccess") || "로그아웃되었습니다");
      onUserChange(null);
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleLogin = () => {
    navigate("/auth");
    setOpen(false);
  };

  const handleSettings = () => {
    navigate("/settings");
    setOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-10 w-10 sm:h-11 sm:w-11 rounded-full hover:bg-accent shrink-0"
          aria-label={t("menu") || "메뉴"}
        >
          <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-2/3">
        <SheetHeader>
          <SheetTitle>{t("menu") || "메뉴"}</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {user && (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="rounded-full bg-primary/10 p-2">
                  <UserIcon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">{t("loggedIn") || "로그인됨"}</p>
                  <p className="text-sm font-semibold truncate">{user.email}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          <div className="space-y-2">
            {user ? (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span>{t("logout") || "로그아웃"}</span>
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={handleLogin}
              >
                <LogIn className="h-5 w-5" />
                <span>{t("login") || "로그인"}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={toggleTheme}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
              <span>{theme === "dark" ? (t("lightMode") || "라이트 모드") : (t("darkMode") || "다크 모드")}</span>
            </Button>

            <Separator />

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={handleSettings}
            >
              <Settings className="h-5 w-5" />
              <span>{t("settings") || "설정"}</span>
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                navigate("/document");
                setOpen(false);
              }}
            >
              <FileText className="h-5 w-5" />
              <span>{t("documentTranslation") || "문서 번역"}</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                navigate("/dictionary");
                setOpen(false);
              }}
            >
              <BookOpen className="h-5 w-5" />
              <span>{t("dictionarySearch") || "사전 검색"}</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={() => {
                navigate("/currency");
                setOpen(false);
              }}
            >
              <Coins className="h-5 w-5" />
              <span>환율 계산기</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
