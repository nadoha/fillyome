import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Volume2, Edit3, Save, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DictionaryEntry {
  pos: string;
  definitions: string[];
  romanization?: string;
  example: string;
}

interface VocabularyItem {
  id: string;
  word: string;
  language: string;
  definition: DictionaryEntry;
  notes?: string;
  created_at: string;
}

interface VocabularyListProps {
  vocabulary: VocabularyItem[];
  isLoading: boolean;
  onRemove: (id: string) => void;
  onUpdateNotes: (id: string, notes: string) => void;
  onSpeak?: (text: string, lang: string) => void;
}

const languageNames: Record<string, string> = {
  ko: "한국어",
  ja: "日本語",
  en: "English",
  zh: "中文",
};

export const VocabularyList = ({ vocabulary, isLoading, onRemove, onUpdateNotes, onSpeak }: VocabularyListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState("");

  const handleEditStart = (item: VocabularyItem) => {
    setEditingId(item.id);
    setEditNotes(item.notes || "");
  };

  const handleEditSave = (id: string) => {
    onUpdateNotes(id, editNotes);
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditNotes("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        ))}
      </div>
    );
  }

  if (vocabulary.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">저장된 단어가 없습니다.</p>
        <p className="text-sm text-muted-foreground mt-2">
          사전 검색 후 단어장 버튼을 눌러 단어를 저장하세요.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {vocabulary.map((item) => (
        <Card key={item.id} className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{item.word}</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {languageNames[item.language] || item.language}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-muted">
                  {item.definition.pos}
                </span>
              </div>
              {item.definition.romanization && (
                <p className="text-sm text-muted-foreground italic mt-1">
                  {item.definition.romanization}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onSpeak && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSpeak(item.word, item.language)}
                  className="h-8 w-8 p-0"
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(item.id)}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Definitions */}
          <div className="space-y-1">
            {item.definition.definitions.map((def, idx) => (
              <p key={idx} className="text-sm text-foreground/90">
                {idx + 1}. {def}
              </p>
            ))}
          </div>

          {/* Example */}
          <div className="border-t border-border/50 pt-2">
            <p className="text-xs text-muted-foreground mb-1">예문:</p>
            <p className="text-sm italic text-foreground/80">{item.definition.example}</p>
          </div>

          {/* Notes Section */}
          <div className="border-t border-border/50 pt-2">
            {editingId === item.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  className="min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleEditSave(item.id)}
                    className="h-7"
                  >
                    <Save className="h-3 w-3 mr-1" />
                    저장
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleEditCancel}
                    className="h-7"
                  >
                    <X className="h-3 w-3 mr-1" />
                    취소
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">메모:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditStart(item)}
                    className="h-6 px-2"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    <span className="text-xs">편집</span>
                  </Button>
                </div>
                {item.notes ? (
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap">{item.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">메모 없음</p>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <p className="text-xs text-muted-foreground">
            {new Date(item.created_at).toLocaleDateString('ko-KR')}
          </p>
        </Card>
      ))}
    </div>
  );
};
