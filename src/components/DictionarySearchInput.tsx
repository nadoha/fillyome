import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchHistoryItem {
  word: string;
  lang: string;
  timestamp: number;
}

interface DictionarySearchInputProps {
  onSearch: (word: string, lang: string) => void;
  sourceLang: string;
}

const HISTORY_KEY = "dictionary_search_history";
const MAX_HISTORY = 10;

export const DictionarySearchInput = ({ onSearch, sourceLang }: DictionarySearchInputProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const history: SearchHistoryItem[] = JSON.parse(stored);
        setSearchHistory(history);
      }
    } catch (error) {
      console.error("Failed to load search history:", error);
    }
  };

  const saveToHistory = (word: string, lang: string) => {
    try {
      const newItem: SearchHistoryItem = {
        word,
        lang,
        timestamp: Date.now(),
      };

      const existing = searchHistory.filter(
        (item) => !(item.word === word && item.lang === lang)
      );

      const updated = [newItem, ...existing].slice(0, MAX_HISTORY);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      const word = searchTerm.trim();
      saveToHistory(word, sourceLang);
      onSearch(word, sourceLang);
      setSearchTerm("");
      setShowHistory(false);
    }
  };

  const handleClear = () => {
    setSearchTerm("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    onSearch(item.word, item.lang);
    setShowHistory(false);
  };

  const deleteHistoryItem = (item: SearchHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = searchHistory.filter(
        (h) => !(h.word === item.word && h.lang === item.lang && h.timestamp === item.timestamp)
      );
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch (error) {
      console.error("Failed to delete history item:", error);
    }
  };

  const clearAllHistory = () => {
    try {
      localStorage.removeItem(HISTORY_KEY);
      setSearchHistory([]);
      setShowHistory(false);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  const languageNames: Record<string, string> = {
    ko: "한국어",
    ja: "일본어",
    en: "영어",
    zh: "중국어",
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowHistory(true)}
            placeholder="단어를 검색하세요..."
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} size="sm" disabled={!searchTerm.trim()}>
          검색
        </Button>
      </div>

      {/* Search History */}
      {showHistory && searchHistory.length > 0 && (
        <div className="bg-background border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>최근 검색어</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllHistory}
              className="h-6 text-xs px-2"
            >
              전체 삭제
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item, index) => (
              <Badge
                key={`${item.word}-${item.timestamp}-${index}`}
                variant="secondary"
                className="cursor-pointer hover:bg-primary/10 transition-colors pr-1 group"
                onClick={() => handleHistoryClick(item)}
              >
                <span className="text-xs">
                  {item.word}
                  <span className="text-muted-foreground ml-1">
                    ({languageNames[item.lang] || item.lang})
                  </span>
                </span>
                <button
                  onClick={(e) => deleteHistoryItem(item, e)}
                  className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
