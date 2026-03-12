import { Home, BookOpen, BookMarked, Settings } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { 
      path: "/", 
      icon: Home, 
      label: t("translation") || "번역",
      ariaLabel: t("translation") || "홈 - 번역"
    },
    { 
      path: "/learn", 
      icon: BookOpen, 
      label: t("learn") || "학습",
      ariaLabel: t("learn") || "학습 메인"
    },
    { 
      path: "/vocabulary", 
      icon: BookMarked, 
      label: t("vocabulary") || "단어장",
      ariaLabel: t("vocabulary") || "나의 단어장"
    },
    { 
      path: "/settings", 
      icon: Settings, 
      label: t("settings") || "설정",
      ariaLabel: t("settings") || "설정"
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border/30 md:hidden pb-safe"
      role="navigation"
      aria-label="메인 네비게이션"
    >
      <div className="flex items-stretch justify-around h-16 max-w-screen-xl mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 min-h-touch transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground active:bg-muted/50"
              )}
              aria-label={item.ariaLabel}
              aria-current={active ? "page" : undefined}
              tabIndex={0}
            >
              <div className={cn(
                "relative flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200",
                active && "bg-primary/10"
              )}>
                <Icon 
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    active && "scale-105"
                  )} 
                  aria-hidden="true"
                />
              </div>
              <span 
                className={cn(
                  "text-[11px] leading-tight",
                  active ? "font-semibold" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
