import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const KANJI_DATA = [
  // N5 레벨 기초 한자
  { char: "日", meaning: "날/해", onyomi: "ニチ, ジツ", kunyomi: "ひ, か", level: "N5", examples: ["日本 (にほん) - 일본", "今日 (きょう) - 오늘"] },
  { char: "月", meaning: "달/월", onyomi: "ゲツ, ガツ", kunyomi: "つき", level: "N5", examples: ["月曜日 (げつようび) - 월요일", "今月 (こんげつ) - 이번 달"] },
  { char: "火", meaning: "불", onyomi: "カ", kunyomi: "ひ", level: "N5", examples: ["火曜日 (かようび) - 화요일", "火事 (かじ) - 화재"] },
  { char: "水", meaning: "물", onyomi: "スイ", kunyomi: "みず", level: "N5", examples: ["水曜日 (すいようび) - 수요일", "水泳 (すいえい) - 수영"] },
  { char: "木", meaning: "나무", onyomi: "モク, ボク", kunyomi: "き", level: "N5", examples: ["木曜日 (もくようび) - 목요일", "木 (き) - 나무"] },
  { char: "金", meaning: "금/돈", onyomi: "キン, コン", kunyomi: "かね", level: "N5", examples: ["金曜日 (きんようび) - 금요일", "お金 (おかね) - 돈"] },
  { char: "土", meaning: "흙/땅", onyomi: "ド, ト", kunyomi: "つち", level: "N5", examples: ["土曜日 (どようび) - 토요일", "土地 (とち) - 토지"] },
  { char: "人", meaning: "사람", onyomi: "ジン, ニン", kunyomi: "ひと", level: "N5", examples: ["日本人 (にほんじん) - 일본인", "人々 (ひとびと) - 사람들"] },
  { char: "山", meaning: "산", onyomi: "サン", kunyomi: "やま", level: "N5", examples: ["富士山 (ふじさん) - 후지산", "山 (やま) - 산"] },
  { char: "川", meaning: "강", onyomi: "セン", kunyomi: "かわ", level: "N5", examples: ["川 (かわ) - 강", "河川 (かせん) - 하천"] },
  { char: "田", meaning: "논/밭", onyomi: "デン", kunyomi: "た", level: "N5", examples: ["田中 (たなか) - 다나카", "水田 (すいでん) - 논"] },
  { char: "大", meaning: "크다", onyomi: "ダイ, タイ", kunyomi: "おお(きい)", level: "N5", examples: ["大きい (おおきい) - 크다", "大学 (だいがく) - 대학"] },
  { char: "小", meaning: "작다", onyomi: "ショウ", kunyomi: "ちい(さい), こ", level: "N5", examples: ["小さい (ちいさい) - 작다", "小学校 (しょうがっこう) - 초등학교"] },
  { char: "中", meaning: "가운데", onyomi: "チュウ", kunyomi: "なか", level: "N5", examples: ["中国 (ちゅうごく) - 중국", "中 (なか) - 안/속"] },
  { char: "上", meaning: "위", onyomi: "ジョウ", kunyomi: "うえ, あ(がる)", level: "N5", examples: ["上 (うえ) - 위", "上手 (じょうず) - 능숙한"] },
  { char: "下", meaning: "아래", onyomi: "カ, ゲ", kunyomi: "した, さ(がる)", level: "N5", examples: ["下 (した) - 아래", "地下鉄 (ちかてつ) - 지하철"] },
  { char: "左", meaning: "왼쪽", onyomi: "サ", kunyomi: "ひだり", level: "N5", examples: ["左 (ひだり) - 왼쪽", "左右 (さゆう) - 좌우"] },
  { char: "右", meaning: "오른쪽", onyomi: "ウ, ユウ", kunyomi: "みぎ", level: "N5", examples: ["右 (みぎ) - 오른쪽", "右手 (みぎて) - 오른손"] },
  { char: "一", meaning: "하나", onyomi: "イチ", kunyomi: "ひと(つ)", level: "N5", examples: ["一つ (ひとつ) - 하나", "一番 (いちばん) - 제일"] },
  { char: "二", meaning: "둘", onyomi: "ニ", kunyomi: "ふた(つ)", level: "N5", examples: ["二つ (ふたつ) - 둘", "二人 (ふたり) - 두 사람"] },
];

export const KanjiSection = () => {
  const [selectedKanji, setSelectedKanji] = useState<typeof KANJI_DATA[0] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "flashcard">("grid");

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.7;
    speechSynthesis.speak(utterance);
  };

  const nextCard = () => {
    setCurrentIndex((prev) => (prev + 1) % KANJI_DATA.length);
  };

  const prevCard = () => {
    setCurrentIndex((prev) => (prev - 1 + KANJI_DATA.length) % KANJI_DATA.length);
  };

  if (viewMode === "flashcard") {
    const currentKanji = KANJI_DATA[currentIndex];
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setViewMode("grid")}>
            목록 보기
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {KANJI_DATA.length}
          </span>
        </div>

        <Card className="p-6">
          <div className="text-center mb-6">
            <Badge variant="outline" className="mb-4">{currentKanji.level}</Badge>
            <div className="text-9xl font-japanese mb-4">{currentKanji.char}</div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => speak(currentKanji.char)}
            >
              <Volume2 className="h-6 w-6" />
            </Button>
          </div>

          <div className="space-y-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">뜻</p>
              <p className="text-xl font-semibold">{currentKanji.meaning}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">음독 (온요미)</p>
                <p className="font-medium">{currentKanji.onyomi}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">훈독 (쿤요미)</p>
                <p className="font-medium">{currentKanji.kunyomi}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">예문</p>
              {currentKanji.examples.map((example, idx) => (
                <p key={idx} className="text-sm">{example}</p>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex justify-center gap-4">
          <Button variant="outline" size="icon" onClick={prevCard}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button variant="outline" size="icon" onClick={nextCard}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">JLPT N5 기초 한자</h2>
        <Button onClick={() => setViewMode("flashcard")}>플래시카드</Button>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
        {KANJI_DATA.map((kanji, index) => (
          <Card
            key={index}
            className={cn(
              "p-3 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-md",
              selectedKanji?.char === kanji.char && "ring-2 ring-primary"
            )}
            onClick={() => {
              setSelectedKanji(kanji);
              speak(kanji.char);
            }}
          >
            <div className="text-3xl font-japanese">{kanji.char}</div>
            <div className="text-xs text-muted-foreground mt-1 truncate">{kanji.meaning}</div>
          </Card>
        ))}
      </div>

      {selectedKanji && (
        <Card className="p-4 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="text-center">
              <div className="text-6xl font-japanese">{selectedKanji.char}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => speak(selectedKanji.char)}
                className="mt-2"
              >
                <Volume2 className="h-4 w-4 mr-1" />
                발음
              </Button>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedKanji.level}</Badge>
                <span className="font-semibold">{selectedKanji.meaning}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">음독: </span>
                  <span>{selectedKanji.onyomi}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">훈독: </span>
                  <span>{selectedKanji.kunyomi}</span>
                </div>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground mb-1">예문:</p>
                {selectedKanji.examples.map((ex, idx) => (
                  <p key={idx}>{ex}</p>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
