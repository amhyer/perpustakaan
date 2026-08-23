"use client";

/**
 * useVoiceSearch — Browser-native voice search pakai Web Speech API.
 *
 * Features:
 * - Tap mic → start listening
 * - Auto-stop on silence (after 2 seconds)
 * - Bahasa Indonesia support (id-ID)
 * - Visual feedback (recording, transcript, error)
 *
 * Browser support:
 * - Chrome/Edge: full
 * - Safari: partial
 * - Firefox: limited
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/form/button";
import { cn } from "@/lib/utils";

type SpeechState = "idle" | "listening" | "processing" | "error";

interface UseVoiceSearchOptions {
  onResult?: (transcript: string) => void;
  locale?: string; // "id-ID" | "en-US" | "ar-SA"
  continuous?: boolean;
  interimResults?: boolean;
}

export function useVoiceSearch(options: UseVoiceSearchOptions = {}) {
  const {
    onResult,
    locale = "id-ID",
    continuous = false,
    interimResults = true,
  } = options;

  const [state, setState] = useState<SpeechState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SR);
    }
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined") return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError("Browser tidak mendukung voice recognition");
      setState("error");
      return;
    }

    try {
      const recognition = new SR();
      recognition.lang = locale;
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;

      recognition.onstart = () => {
        setState("listening");
        setTranscript("");
        setError(null);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        // Auto-stop after 2 seconds of silence (jika interim)
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (interimTranscript) {
          silenceTimeoutRef.current = setTimeout(() => {
            recognition.stop();
          }, 2000);
        }

        if (finalTranscript && onResult) {
          onResult(finalTranscript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        setError(event.error);
        setState("error");
        if (event.error === "not-allowed") {
          toast.error("Izin microphone ditolak");
        }
      };

      recognition.onend = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        if (state === "listening") {
          setState("idle");
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      setError(String(err));
      setState("error");
    }
  }, [locale, continuous, interimResults, onResult, state]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    setState("idle");
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setError(null);
    setState("idle");
  }, []);

  return {
    state,
    transcript,
    error,
    isSupported,
    start,
    stop,
    reset,
  };
}

// ===== UI Component =====

interface VoiceSearchButtonProps {
  onResult: (text: string) => void;
  locale?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function VoiceSearchButton({
  onResult,
  locale = "id-ID",
  className,
  size = "md",
}: VoiceSearchButtonProps) {
  const { state, transcript, isSupported, start, stop, error } = useVoiceSearch({
    onResult,
    locale,
  });

  const sizeClass = {
    sm: "h-7 w-7",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }[size];

  if (!isSupported) return null;

  const isListening = state === "listening";
  const isError = state === "error";

  return (
    <div className="relative">
      <Button
        type="button"
        variant={isListening ? "default" : isError ? "destructive" : "outline"}
        size="icon"
        onClick={isListening ? stop : start}
        className={cn(
          sizeClass,
          "rounded-full",
          isListening && "animate-pulse bg-red-500 hover:bg-red-600",
          className
        )}
        aria-label={isListening ? "Berhenti merekam" : "Cari dengan suara"}
      >
        {isError ? (
          <AlertCircle className="h-4 w-4" />
        ) : isListening ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {/* Live transcript popup */}
      {isListening && transcript && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white border rounded-lg shadow-lg p-2 text-sm whitespace-nowrap max-w-xs">
          🎤 {transcript}...
        </div>
      )}
    </div>
  );
}
