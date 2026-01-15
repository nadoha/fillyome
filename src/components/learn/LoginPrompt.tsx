import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface LoginPromptProps {
  title?: string;
  description?: string;
}

export const LoginPrompt = ({ 
  title = "계정 연결이 필요해요",
  description = "이 기능을 사용하려면 계정을 연결해 주세요"
}: LoginPromptProps) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div className="text-center py-4">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
      </div>

      <Card className="border-border shadow-none">
        <CardContent className="p-5 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            계정을 연결하면 번역 기록을 바탕으로<br />
            맞춤 학습 문제를 제공해 드려요
          </p>
          <Button 
            className="w-full"
            onClick={() => navigate("/auth")}
          >
            Google 계정 연결하기
          </Button>
          <Button 
            variant="ghost"
            className="text-sm text-muted-foreground"
            onClick={() => navigate("/")}
          >
            나중에 하기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
