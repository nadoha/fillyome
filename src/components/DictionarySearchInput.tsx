import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Clock, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SearchHistoryItem {
  word: string;
  lang: string;
  timestamp: number;
  count: number;
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
  const [isComposing, setIsComposing] = useState(false);

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
      // Find existing item with same word and lang
      const existingIndex = searchHistory.findIndex(
        (item) => item.word === word && item.lang === lang
      );

      let updated: SearchHistoryItem[];
      
      if (existingIndex !== -1) {
        // Increment count and move to front
        const existingItem = searchHistory[existingIndex];
        const updatedItem: SearchHistoryItem = {
          ...existingItem,
          count: existingItem.count + 1,
          timestamp: Date.now(),
        };
        
        const others = searchHistory.filter((_, i) => i !== existingIndex);
        updated = [updatedItem, ...others];
      } else {
        // Create new item
        const newItem: SearchHistoryItem = {
          word,
          lang,
          timestamp: Date.now(),
          count: 1,
        };
        updated = [newItem, ...searchHistory].slice(0, MAX_HISTORY);
      }

      localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      setSearchHistory(updated);
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      const word = searchTerm.trim();
      
      // Basic validation: filter out meaningless inputs
      if (word.length < 2 && sourceLang === 'ko') {
        // Korean: single character is usually not a complete word (except some rare cases)
        return;
      }
      
      // Filter out common incomplete Korean particles
      const incompleteKoreanParticles = ['료', '어', '의', '는', '가', '을', '를', '이', '에', '와', '과', '로', '으로', '도', '만', '부터', '까지'];
      if (sourceLang === 'ko' && incompleteKoreanParticles.includes(word)) {
        return;
      }
      
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
    if (e.key === "Enter" && !isComposing) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
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

  // Get popular words (searched 2+ times)
  const popularWords = searchHistory
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentWords = searchHistory.slice(0, 8);

  return (
    <div className="space-y-2">
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
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
        <div className="bg-background border border-border rounded-lg p-3 space-y-3">
          {/* Popular Words Section */}
          {popularWords.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <Flame className="h-3 w-3 text-orange-500" />
                <span>인기 검색어</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {popularWords.map((item, index) => (
                  <Badge
                    key={`popular-${item.word}-${item.timestamp}-${index}`}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10 transition-colors pr-1 group bg-orange-500/10 border-orange-500/20"
                    onClick={() => handleHistoryClick(item)}
                  >
                    <span className="text-xs">
                      {item.word}
                      <span className="text-muted-foreground ml-1">
                        ({languageNames[item.lang] || item.lang})
                      </span>
                      <span className="ml-1 text-orange-600 font-semibold">
                        {item.count}
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

          {/* Recent Words Section */}
          <div>
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
              {recentWords.map((item, index) => (
                <Badge
                  key={`recent-${item.word}-${item.timestamp}-${index}`}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary/10 transition-colors pr-1 group"
                  onClick={() => handleHistoryClick(item)}
                >
                  <span className="text-xs">
                    {item.word}
                    <span className="text-muted-foreground ml-1">
                      ({languageNames[item.lang] || item.lang})
                    </span>
                    {item.count > 1 && (
                      <span className="ml-1 text-muted-foreground">
                        {item.count}
                      </span>
                    )}
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
        </div>
      )}
    </div>
  );
};
