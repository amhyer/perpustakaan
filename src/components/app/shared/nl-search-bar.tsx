"use client";

/**
 * Natural Language Search Bar.
 *
 * Sprint N - Tier 2 #5: AI-Powered Search UI.
 *
 * Features:
 * - Large search input with placeholder hint
 * - "Try asking" suggestions
 * - Real-time parsing preview
 * - Match reasons display
 * - Highlighting of matched text
 * - Filter by audience, level, type
 *
 * Uses: /api/search/natural
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Sparkles, Loader2, X, ChevronRight, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/form/button";
import { Badge } from "@/components/ui/data-display/badge";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ParsedQuery {
  topic: string | null;
  genre: string | null;
  audience: string | null;
  level: string | null;
  grade: number | null;
  subject: string | null;
  type: string | null;
  mood: string | null;
  language: string | null;
  confidence: number;
  keywords: string[];
}

interface ScoredBook {
  bookId: string;
  title: string;
  author: string;
  score: number;
  matchReasons: string[];
  highlights: Record<string, string>;
}

interface NLResult {
  query: string;
  parsed: ParsedQuery;
  description: string;
  results: ScoredBook[];
  total: number;
}

interface NLSearchBarProps {
  onSelectBook?: (bookId: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const SUGGESTIONS = [
  "Cari buku tentang persahabatan untuk anak SMP",
  "Novel romance untuk remaja putri",
  "Buku matematika kelas 10",
  "Komik lucu untuk anak SD",
  "Buku sejarah Indonesia menarik",
  "Novel petualangan seru",
];

const LEVEL_LABELS: Record<string, string> = {
  TK: "TK",
  SD: "SD",
  SMP: "SMP",
  SMA: "SMA",
  UMUM: "Umum",
};

const AUDIENCE_LABELS: Record<string, string> = {
  anak: "Anak",
  remaja: "Remaja",
  "remaja-putri": "Remaja Putri",
  "remaja-putra": "Remaja Putra",
  dewasa: "Dewasa",
};

export function NLSearchBar({
  onSelectBook,
  placeholder = "Cari: 'buku tentang persahabatan untuk SMP'...",
  autoFocus,
  className,
}: NLSearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NLResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Debounced search
  const performSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<NLResult>(`/api/search/natural?q=${encodeURIComponent(q)}&limit=15`);
      setResults(data);
    } catch (err: any) {
      setError(err.message || "Pencarian gagal");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, performSearch]);

  const handleClear = () => {
    setQuery("");
    setResults(null);
    setError(null);
  };

  const useSuggestion = (s: string) => {
    setQuery(s);
    setShowSuggestions(false);
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Search input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 rounded-lg border bg-background text-sm focus:ring-2 focus:ring-primary focus:border-primary"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {loading && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Suggestions dropdown */}
        {showSuggestions && query.length < 2 && (
          <Card className="absolute top-full mt-1 left-0 right-0 z-10 p-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
              💡 Coba tanya
            </div>
            {SUGGESTIONS.map((s, i) => (
              <button
                key={i}
                onClick={() => useSuggestion(s)}
                className="w-full text-left text-xs px-2 py-1.5 hover:bg-muted rounded flex items-center gap-2"
              >
                <Sparkles className="h-3 w-3 text-primary shrink-0" />
                <span>{s}</span>
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* Parsed query display */}
      {results && results.parsed && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">{results.description}</span>
          {results.parsed.confidence > 0 && (
            <Badge variant="outline" className="text-[10px] h-4">
              {Math.round(results.parsed.confidence * 100)}% yakin
            </Badge>
          )}
          {results.parsed.audience && (
            <Badge variant="secondary" className="text-[10px] h-4">
              {AUDIENCE_LABELS[results.parsed.audience] || results.parsed.audience}
            </Badge>
          )}
          {results.parsed.level && (
            <Badge variant="secondary" className="text-[10px] h-4">
              {LEVEL_LABELS[results.parsed.level] || results.parsed.level}
            </Badge>
          )}
          {results.parsed.subject && (
            <Badge variant="secondary" className="text-[10px] h-4">
              {results.parsed.subject}
            </Badge>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-sm text-destructive p-3 bg-destructive/10 rounded">
          {error}
        </div>
      )}

      {/* Results */}
      {results && results.results.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground px-1">
            {results.total} hasil ditemukan
          </div>
          {results.results.map((book) => (
            <Card
              key={book.bookId}
              className="p-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onSelectBook?.(book.bookId)}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">
                        {book.highlights.title ? (
                          <span dangerouslySetInnerHTML={{
                            __html: book.highlights.title
                              .replace(/»/g, "<mark class='bg-yellow-200 dark:bg-yellow-900'>")
                              .replace(/«/g, "</mark>")
                          }} />
                        ) : (
                          book.title
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {book.author}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-bold text-primary">
                        {Math.round(book.score * 100)}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">match</div>
                    </div>
                  </div>
                  {book.matchReasons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {book.matchReasons.slice(0, 3).map((r, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] h-4 px-1.5 font-normal"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {results && results.results.length === 0 && query.length >= 2 && (
        <Card className="p-8 text-center">
          <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-40" />
          <div className="text-sm font-medium mb-1">Tidak ada hasil</div>
          <div className="text-xs text-muted-foreground">
            Coba kata kunci lain atau kurangi filter
          </div>
        </Card>
      )}
    </div>
  );
}
