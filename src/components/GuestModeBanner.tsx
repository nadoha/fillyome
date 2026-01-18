import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface GuestModeBannerProps {
  message?: string;
}

export const GuestModeBanner = ({ 
  message = "로그인하면 데이터를 저장할 수 있어요" 
}: GuestModeBannerProps) => {
  const navigate = useNavigate();

  return (
    <div className="bg-muted/50 border border-border rounded-lg p-3 mb-4 flex items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => navigate("/auth")}
        className="shrink-0"
      >
        <LogIn className="h-4 w-4 mr-1.5" />
        로그인
      </Button>
    </div>
  );
};
