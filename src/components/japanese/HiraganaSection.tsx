import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const HIRAGANA_DATA = [
  // 기본 모음
  { char: "あ", romaji: "a", row: "vowel" },
  { char: "い", romaji: "i", row: "vowel" },
  { char: "う", romaji: "u", row: "vowel" },
  { char: "え", romaji: "e", row: "vowel" },
  { char: "お", romaji: "o", row: "vowel" },
  // K행
  { char: "か", romaji: "ka", row: "k" },
  { char: "き", romaji: "ki", row: "k" },
  { char: "く", romaji: "ku", row: "k" },
  { char: "け", romaji: "ke", row: "k" },
  { char: "こ", romaji: "ko", row: "k" },
  // S행
  { char: "さ", romaji: "sa", row: "s" },
  { char: "し", romaji: "shi", row: "s" },
  { char: "す", romaji: "su", row: "s" },
  { char: "せ", romaji: "se", row: "s" },
  { char: "そ", romaji: "so", row: "s" },
  // T행
  { char: "た", romaji: "ta", row: "t" },
  { char: "ち", romaji: "chi", row: "t" },
  { char: "つ", romaji: "tsu", row: "t" },
  { char: "て", romaji: "te", row: "t" },
  { char: "と", romaji: "to", row: "t" },
  // N행
  { char: "な", romaji: "na", row: "n" },
  { char: "に", romaji: "ni", row: "n" },
  { char: "ぬ", romaji: "nu", row: "n" },
  { char: "ね", romaji: "ne", row: "n" },
  { char: "の", romaji: "no", row: "n" },
  // H행
  { char: "は", romaji: "ha", row: "h" },
  { char: "ひ", romaji: "hi", row: "h" },
  { char: "ふ", romaji: "fu", row: "h" },
  { char: "へ", romaji: "he", row: "h" },
  { char: "ほ", romaji: "ho", row: "h" },
  // M행
  { char: "ま", romaji: "ma", row: "m" },
  { char: "み", romaji: "mi", row: "m" },
  { char: "む", romaji: "mu", row: "m" },
  { char: "め", romaji: "me", row: "m" },
  { char: "も", romaji: "mo", row: "m" },
  // Y행
  { char: "や", romaji: "ya", row: "y" },
  { char: "ゆ", romaji: "yu", row: "y" },
  { char: "よ", romaji: "yo", row: "y" },
  // R행
  { char: "ら", romaji: "ra", row: "r" },
  { char: "り", romaji: "ri", row: "r" },
  { char: "る", romaji: "ru", row: "r" },
  { char: "れ", romaji: "re", row: "r" },
  { char: "ろ", romaji: "ro", row: "r" },
  // W행
  { char: "わ", romaji: "wa", row: "w" },
  { char: "を", romaji: "wo", row: "w" },
  // N
  { char: "ん", romaji: "n", row: "special" },
];

type StudyMode = "chart" | "quiz";

export const HiraganaSection = () => {
  const [mode, setMode] = useState<StudyMode>("chart");
  const [selectedChar, setSelectedChar] = useState<typeof HIRAGANA_DATA[0] | null>(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [shuffledData, setShuffledData] = useState<typeof HIRAGANA_DATA>([]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const startQuiz = () => {
    const shuffled = [...HIRAGANA_DATA].sort(() => Math.random() - 0.5);
    setShuffledData(shuffled);
    setQuizIndex(0);
    setScore({ correct: 0, wrong: 0 });
    setShowAnswer(false);
    setMode("quiz");
  };

  const handleQuizAnswer = (isCorrect: boolean) => {
    if (isCorrect) {
      setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
    }
    
    if (quizIndex < shuffledData.length - 1) {
      setQuizIndex((prev) => prev + 1);
      setShowAnswer(false);
    } else {
      setMode("chart");
    }
  };

  if (mode === "quiz" && shuffledData.length > 0) {
    const currentChar = shuffledData[quizIndex];
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => setMode("chart")}>
            돌아가기
          </Button>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600">✓ {score.correct}</span>
            <span className="text-red-600">✗ {score.wrong}</span>
            <span className="text-muted-foreground">
              {quizIndex + 1}/{shuffledData.length}
            </span>
          </div>
        </div>

        <Card className="p-8 text-center">
          <div className="text-8xl font-japanese mb-6">{currentChar.char}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => speak(currentChar.char)}
            className="mb-4"
          >
            <Volume2 className="h-6 w-6" />
          </Button>

          {showAnswer ? (
            <div className="space-y-4">
              <p className="text-2xl font-bold text-primary">{currentChar.romaji}</p>
              <div className="flex justify-center gap-4">
                <Button
                  variant="outline"
                  className="border-green-500 text-green-600 hover:bg-green-50"
                  onClick={() => handleQuizAnswer(true)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  맞았어요
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500 text-red-600 hover:bg-red-50"
                  onClick={() => handleQuizAnswer(false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  틀렸어요
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowAnswer(true)}>정답 보기</Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">히라가나 표</h2>
        <Button onClick={startQuiz}>퀴즈 시작</Button>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {HIRAGANA_DATA.map((item, index) => (
          <Card
            key={index}
            className={cn(
              "p-3 text-center cursor-pointer transition-all hover:scale-105 hover:shadow-md",
              selectedChar?.char === item.char && "ring-2 ring-primary"
            )}
            onClick={() => {
              setSelectedChar(item);
              speak(item.char);
            }}
          >
            <div className="text-2xl font-japanese">{item.char}</div>
            <div className="text-xs text-muted-foreground mt-1">{item.romaji}</div>
          </Card>
        ))}
      </div>

      {selectedChar && (
        <Card className="p-4 text-center bg-primary/5">
          <div className="text-6xl font-japanese mb-2">{selectedChar.char}</div>
          <div className="text-xl font-bold text-primary">{selectedChar.romaji}</div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => speak(selectedChar.char)}
            className="mt-2"
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        </Card>
      )}
    </div>
  );
};
