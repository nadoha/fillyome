import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { BottomNavigation } from "@/components/BottomNavigation";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 pb-20 md:pb-0">
        <div className="text-center px-4">
          <h1 className="mb-4 text-6xl sm:text-8xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">404</h1>
          <p className="mb-8 text-xl sm:text-2xl text-muted-foreground">
            {t("pageNotFound") || "페이지를 찾을 수 없습니다"}
          </p>
          <Button
            onClick={() => navigate("/")}
            size="lg"
            className="gap-2"
          >
            <Home className="h-5 w-5" />
            {t("returnHome") || "홈으로 돌아가기"}
          </Button>
        </div>
      </div>
      <BottomNavigation />
    </>
  );
};

export default NotFound;
