"use client";

import { useState, useEffect, useRef } from "react";
import { speakArabic, isSpeechSupported, stopSpeaking } from "@/lib/speech";

interface SpeakerButtonProps {
  text: string;
  audioUrl?: string | null; // Pre-generated audio URL
  cardId?: number; // For on-demand generation
  size?: "sm" | "md" | "lg";
  className?: string;
  onAudioGenerated?: (audioUrl: string) => void; // Callback when audio is generated
}

export default function SpeakerButton({
  text,
  audioUrl,
  cardId,
  size = "md",
  className = "",
  onAudioGenerated,
}: SpeakerButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [currentAudioUrl, setCurrentAudioUrl] = useState(audioUrl);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setIsSupported(isSpeechSupported());

    // Load voices
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  // Clean up and reset when card changes
  useEffect(() => {
    // Stop any playing audio and clear the reference
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    stopSpeaking();
    setIsPlaying(false);
    // Reset audio URL to the new card's audio URL
    setCurrentAudioUrl(audioUrl);
  }, [cardId, audioUrl]);

  // Play saved audio file
  const playAudioFile = (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => {
      setIsPlaying(false);
      // Fall back to Web Speech API if file fails to load
      playWithWebSpeech();
    };

    audio.play().catch(() => {
      playWithWebSpeech();
    });
  };

  // Play using Web Speech API
  const playWithWebSpeech = () => {
    setIsPlaying(true);
    speakArabic(text, {
      rate: 0.85,
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  // Generate audio via ElevenLabs
  const generateAudio = async () => {
    if (!cardId || isGenerating) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audio_url) {
          setCurrentAudioUrl(data.audio_url);
          onAudioGenerated?.(data.audio_url);
          // Play the newly generated audio
          playAudioFile(data.audio_url);
        }
      } else {
        // If generation fails, fall back to Web Speech
        playWithWebSpeech();
      }
    } catch (error) {
      console.error("Failed to generate audio:", error);
      playWithWebSpeech();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      stopSpeaking();
      setIsPlaying(false);
      return;
    }

    // If we have a saved audio URL, use it
    if (currentAudioUrl) {
      playAudioFile(currentAudioUrl);
      return;
    }

    // If we have a cardId and can generate, try to generate
    if (cardId) {
      generateAudio();
      return;
    }

    // Fall back to Web Speech API
    playWithWebSpeech();
  };

  // Long press to regenerate (if cardId provided)
  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!cardId || isGenerating) return;

    // Delete existing and regenerate
    if (currentAudioUrl) {
      try {
        await fetch(`/api/audio?cardId=${cardId}`, { method: "DELETE" });
        setCurrentAudioUrl(null);
      } catch (error) {
        console.error("Failed to delete audio:", error);
      }
    }

    generateAudio();
  };

  if (!isSupported && !currentAudioUrl) {
    return null;
  }

  const sizeClasses = {
    sm: "h-6 w-6 p-1",
    md: "h-8 w-8 p-1.5",
    lg: "h-10 w-10 p-2",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={cardId ? handleContextMenu : undefined}
      disabled={isGenerating}
      className={`inline-flex items-center justify-center rounded-full transition-colors ${
        isGenerating
          ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse"
          : isPlaying
          ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          : currentAudioUrl
          ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
          : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600"
      } ${sizeClasses[size]} ${className}`}
      title={
        isGenerating
          ? "Generating audio..."
          : isPlaying
          ? "Stop"
          : currentAudioUrl
          ? "Play (ElevenLabs audio)"
          : cardId
          ? "Generate & play audio"
          : "Play pronunciation"
      }
      aria-label={isPlaying ? "Stop pronunciation" : "Play pronunciation"}
    >
      {isGenerating ? (
        // Loading spinner
        <svg className={`${iconSizes[size]} animate-spin`} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : isPlaying ? (
        // Stop icon
        <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
      ) : (
        // Speaker icon
        <svg className={iconSizes[size]} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      )}
    </button>
  );
}
