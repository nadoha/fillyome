import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HiraganaSection } from "@/components/japanese/HiraganaSection";
import { KatakanaSection } from "@/components/japanese/KatakanaSection";
import { KanjiSection } from "@/components/japanese/KanjiSection";
import { WritingPractice } from "@/components/japanese/WritingPractice";

const JapaneseLearning = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("hiragana");

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background border-b p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/learn")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">일본어 학습</h1>
        </div>
      </header>

      <main className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="hiragana" className="text-xs sm:text-sm">
              히라가나
            </TabsTrigger>
            <TabsTrigger value="katakana" className="text-xs sm:text-sm">
              가타카나
            </TabsTrigger>
            <TabsTrigger value="kanji" className="text-xs sm:text-sm">
              칸지
            </TabsTrigger>
            <TabsTrigger value="writing" className="text-xs sm:text-sm">
              따라쓰기
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hiragana">
            <HiraganaSection />
          </TabsContent>

          <TabsContent value="katakana">
            <KatakanaSection />
          </TabsContent>

          <TabsContent value="kanji">
            <KanjiSection />
          </TabsContent>

          <TabsContent value="writing">
            <WritingPractice />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default JapaneseLearning;
