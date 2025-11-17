import { Home, BookOpen, BookMarked, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { 
      path: "/", 
      icon: Home, 
      label: t("translate") || "번역",
      ariaLabel: "홈 - 번역"
    },
    { 
      path: "/dictionary", 
      icon: BookOpen, 
      label: t("dictionary") || "사전",
      ariaLabel: "사전 검색"
    },
    { 
      path: "/vocabulary", 
      icon: BookMarked, 
      label: t("vocabulary") || "단어장",
      ariaLabel: "나의 단어장"
    },
    { 
      path: "/settings", 
      icon: Settings, 
      label: t("settings") || "설정",
      ariaLabel: "설정"
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-lg md:hidden">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 h-full rounded-none transition-all duration-200 ${
                active 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              aria-label={item.ariaLabel}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={`h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
              <span className={`text-xs font-medium ${active ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
};
