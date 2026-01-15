import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eraser, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PRACTICE_CHARS = [
  // 히라가나
  { char: "あ", type: "hiragana", romaji: "a" },
  { char: "い", type: "hiragana", romaji: "i" },
  { char: "う", type: "hiragana", romaji: "u" },
  { char: "え", type: "hiragana", romaji: "e" },
  { char: "お", type: "hiragana", romaji: "o" },
  { char: "か", type: "hiragana", romaji: "ka" },
  { char: "き", type: "hiragana", romaji: "ki" },
  { char: "く", type: "hiragana", romaji: "ku" },
  { char: "け", type: "hiragana", romaji: "ke" },
  { char: "こ", type: "hiragana", romaji: "ko" },
  // 가타카나
  { char: "ア", type: "katakana", romaji: "a" },
  { char: "イ", type: "katakana", romaji: "i" },
  { char: "ウ", type: "katakana", romaji: "u" },
  { char: "エ", type: "katakana", romaji: "e" },
  { char: "オ", type: "katakana", romaji: "o" },
  { char: "カ", type: "katakana", romaji: "ka" },
  { char: "キ", type: "katakana", romaji: "ki" },
  { char: "ク", type: "katakana", romaji: "ku" },
  { char: "ケ", type: "katakana", romaji: "ke" },
  { char: "コ", type: "katakana", romaji: "ko" },
  // 기초 한자
  { char: "日", type: "kanji", romaji: "nichi/hi" },
  { char: "月", type: "kanji", romaji: "getsu/tsuki" },
  { char: "火", type: "kanji", romaji: "ka/hi" },
  { char: "水", type: "kanji", romaji: "sui/mizu" },
  { char: "木", type: "kanji", romaji: "moku/ki" },
];

type CharType = "hiragana" | "katakana" | "kanji";

export const WritingPractice = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedType, setSelectedType] = useState<CharType>("hiragana");
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  const filteredChars = PRACTICE_CHARS.filter((c) => c.type === selectedType);
  const currentChar = filteredChars[currentIndex % filteredChars.length];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 캔버스 크기 설정
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // 배경 그리기
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 가이드 문자 그리기
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.font = `${rect.width * 0.7}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(currentChar?.char || "", rect.width / 2, rect.height / 2);

    // 격자 그리기
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // 십자선
    ctx.beginPath();
    ctx.moveTo(rect.width / 2, 0);
    ctx.lineTo(rect.width / 2, rect.height);
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();

    ctx.setLineDash([]);
  }, [currentChar, currentIndex]);

  const getPosition = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPosition(e);
    setLastPos(pos);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !lastPos) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const pos = getPosition(e);

    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    setLastPos(pos);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    setLastPos(null);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);

    // 가이드 문자 다시 그리기
    ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
    ctx.font = `${rect.width * 0.7}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(currentChar?.char || "", rect.width / 2, rect.height / 2);

    // 격자 다시 그리기
    ctx.strokeStyle = "rgba(0, 0, 0, 0.1)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(rect.width / 2, 0);
    ctx.lineTo(rect.width / 2, rect.height);
    ctx.moveTo(0, rect.height / 2);
    ctx.lineTo(rect.width, rect.height / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const nextChar = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredChars.length);
    setTimeout(clearCanvas, 50);
  };

  const prevChar = () => {
    setCurrentIndex((prev) => (prev - 1 + filteredChars.length) % filteredChars.length);
    setTimeout(clearCanvas, 50);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">손글씨 따라쓰기</h2>
      </div>

      <div className="flex gap-2 justify-center">
        {(["hiragana", "katakana", "kanji"] as CharType[]).map((type) => (
          <Button
            key={type}
            variant={selectedType === type ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setSelectedType(type);
              setCurrentIndex(0);
            }}
          >
            {type === "hiragana" ? "히라가나" : type === "katakana" ? "가타카나" : "칸지"}
          </Button>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" size="icon" onClick={prevChar}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <span className="text-4xl font-japanese">{currentChar?.char}</span>
            <p className="text-sm text-muted-foreground mt-1">{currentChar?.romaji}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={nextChar}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full aspect-square border-2 border-dashed border-muted-foreground/30 rounded-lg touch-none cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex justify-center gap-4 mt-4">
          <Button variant="outline" onClick={clearCanvas}>
            <Eraser className="h-4 w-4 mr-2" />
            지우기
          </Button>
          <Button variant="outline" onClick={nextChar}>
            <RotateCcw className="h-4 w-4 mr-2" />
            다음 글자
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-medium mb-3">연습할 글자</h3>
        <div className="flex flex-wrap gap-2">
          {filteredChars.map((item, index) => (
            <Button
              key={index}
              variant={index === currentIndex % filteredChars.length ? "default" : "outline"}
              size="sm"
              className={cn("w-10 h-10 text-lg font-japanese")}
              onClick={() => {
                setCurrentIndex(index);
                setTimeout(clearCanvas, 50);
              }}
            >
              {item.char}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};
