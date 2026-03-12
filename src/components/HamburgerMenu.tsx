import { Menu, LogIn, LogOut, Moon, Sun, Settings, User as UserIcon, FileText, BookOpen, Coins, ChevronRight } from "lucide-react";
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
      toast.success(t("logoutSuccess"));
      onUserChange(null);
      setOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleNav = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const menuItems = [
    { icon: FileText, label: t("documentTranslation"), path: "/document" },
    { icon: BookOpen, label: t("dictionarySearch"), path: "/dictionary" },
    { icon: Coins, label: t("currencyExchange"), path: "/currency" },
    { icon: Settings, label: t("settings"), path: "/settings" },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-accent shrink-0"
          aria-label={t("menu")}
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-5 pb-4">
            <SheetTitle className="text-lg">{t("menu")}</SheetTitle>
          </div>

          {/* User profile */}
          {user && (
            <div className="px-5 pb-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <UserIcon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    {t("loggedIn")}
                  </p>
                  <p className="text-sm font-medium truncate mt-0.5">{user.email}</p>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Navigation */}
          <div className="flex-1 py-2 overflow-y-auto">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-accent/50 transition-colors text-left group"
              >
                <item.icon className="h-[18px] w-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
              </button>
            ))}

            <Separator className="my-2" />

            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-accent/50 transition-colors text-left group"
            >
              {theme === "dark" ? (
                <Sun className="h-[18px] w-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
              ) : (
                <Moon className="h-[18px] w-[18px] text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
              <span>{theme === "dark" ? t("lightMode") : t("darkMode")}</span>
            </button>
          </div>

          {/* Footer auth action */}
          <div className="p-4 border-t border-border/50">
            {user ? (
              <Button
                variant="outline"
                className="w-full justify-center gap-2 h-11 rounded-xl text-sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>{t("logout")}</span>
              </Button>
            ) : (
              <Button
                className="w-full justify-center gap-2 h-11 rounded-xl text-sm"
                onClick={() => handleNav("/auth")}
              >
                <LogIn className="h-4 w-4" />
                <span>{t("login")}</span>
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};