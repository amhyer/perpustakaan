"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface AutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions: string[];
  /** Jika true, field wajib diisi (untuk styling required) */
  required?: boolean;
  /** Label yang accessible */
  "aria-label"?: string;
}

/**
 * Input teks dengan dropdown autocomplete.
 * - User bisa ketik nilai baru (tidak terbatas pada suggestions)
 * - Saat fokus & ada match, tampilkan dropdown dengan opsi yang mengandung teks
 * - Klik opsi → isi input dengan nilai tsb
 * - Tidak memaksa pilih dari daftar — teks bebas tetap valid
 */
export function AutocompleteInput({
  id,
  value,
  onChange,
  placeholder,
  suggestions,
  required,
  ...rest
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on current value (case-insensitive, contains)
  const filtered = suggestions.filter((s) => {
    if (!value.trim()) return true;
    return s.toLowerCase().includes(value.toLowerCase());
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || filtered.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setOpen(true);
        setHighlightIndex(0);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      onChange(filtered[highlightIndex]);
      setOpen(false);
      setHighlightIndex(-1);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  function selectSuggestion(s: string) {
    onChange(s);
    setOpen(false);
    setHighlightIndex(-1);
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        ref={inputRef}
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHighlightIndex(-1);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        autoComplete="off"
        {...rest}
      />
      {suggestions.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            setOpen(!open);
            inputRef.current?.focus();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Tampilkan saran"
        >
          <ChevronsUpDown className="h-4 w-4" />
        </button>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto">
          {filtered.slice(0, 50).map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseEnter={() => setHighlightIndex(i)}
              onClick={() => selectSuggestion(s)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-1.5 text-sm text-left",
                i === highlightIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
              )}
            >
              <span className="truncate">{s}</span>
              {value === s && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
            </button>
          ))}
          {filtered.length > 50 && (
            <div className="px-3 py-1 text-xs text-muted-foreground border-t">
              +{filtered.length - 50} lainnya...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
