"use client";

import { useState, useEffect, useRef } from "react";
import { useRecorder } from "@/hooks/useRecorder";
import Header from "@/components/Header";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";

interface Text {
  id: number;
  title: string | null;
  arabic: string;
  transliteration: string | null;
  translation: string;
  category: string | null;
  recording_url: string | null;
  tts_audio_url: string | null;
  tts_provider: string | null;
  created_at: string;
}

interface Card {
  id: number;
  front: string;
  back: string;
}

export default function ReadingPage() {
  const lang = useFeatureGuard("reading");
  const [texts, setTexts] = useState<Text[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<Text | null>(null);
  const [linkedCards, setLinkedCards] = useState<Card[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newText, setNewText] = useState({ title: "", arabic: "", translation: "", category: "" });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingTranslit, setIsGeneratingTranslit] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isTtsPlaying, setIsTtsPlaying] = useState(false);
  const [isExtractingImage, setIsExtractingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Use shared recorder hook
  const recorder = useRecorder();

  useEffect(() => {
    fetchTexts();
  }, [lang]);

  async function fetchTexts() {
    const res = await fetch(`/api/texts?language=${lang}`);
    const data = await res.json();
    setTexts(data);
    setIsLoading(false);
  }

  async function selectText(text: Text) {
    setSelectedText(text);
    setShowTranslation(false);
    setIsPlaying(false);
    recorder.clearRecording();
    // Fetch linked cards
    const res = await fetch(`/api/texts/${text.id}?cards=true`);
    const data = await res.json();
    setLinkedCards(data.cards || []);
  }

  async function createText(e: React.FormEvent) {
    e.preventDefault();
    if (!newText.arabic.trim() || !newText.translation.trim()) return;

    await fetch("/api/texts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newText.title || null,
        arabic: newText.arabic,
        translation: newText.translation,
        category: newText.category || null,
      }),
    });

    setNewText({ title: "", arabic: "", translation: "", category: "" });
    setShowModal(false);
    fetchTexts();
  }

  async function deleteText(id: number) {
    if (!confirm("Delete this text?")) return;
    await fetch(`/api/texts/${id}`, { method: "DELETE" });
    if (selectedText?.id === id) {
      setSelectedText(null);
      setLinkedCards([]);
    }
    fetchTexts();
  }

  async function handleStartRecording() {
    try {
      await recorder.startRecording();
    } catch {
      alert("Could not access microphone. Please check permissions.");
    }
  }

  async function handleUploadRecording() {
    if (!selectedText) return;

    const success = await recorder.uploadRecording(`/api/texts/${selectedText.id}/recording`);
    if (success) {
      // Refresh the text to get updated recording_url
      const res = await fetch(`/api/texts/${selectedText.id}`);
      const updated = await res.json();
      setSelectedText(updated);
      setTexts((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      alert("Failed to upload recording");
    }
  }

  function playRecording() {
    if (!selectedText?.recording_url) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(selectedText.recording_url);
    audioRef.current = audio;

    audio.onplay = () => setIsPlaying(true);
    audio.onended = () => setIsPlaying(false);
    audio.onpause = () => setIsPlaying(false);

    audio.play();
  }

  function stopPlaying() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }

  async function deleteRecording() {
    if (!selectedText || !confirm("Delete this recording?")) return;

    try {
      const res = await fetch(`/api/texts/${selectedText.id}/recording`, {
        method: "DELETE",
      });

      if (res.ok) {
        const updated = { ...selectedText, recording_url: null };
        setSelectedText(updated);
        setTexts((prev) =>
          prev.map((t) => (t.id === selectedText.id ? updated : t))
        );
      }
    } catch (error) {
      console.error("Error deleting recording:", error);
    }
  }

  async function generateTransliteration() {
    if (!selectedText || isGeneratingTranslit) return;
    setIsGeneratingTranslit(true);
    try {
      const res = await fetch(`/api/texts/${selectedText.id}/transliterate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...selectedText, transliteration: data.transliteration };
        setSelectedText(updated);
        setTexts((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch (error) {
      console.error("Failed to generate transliteration:", error);
    } finally {
      setIsGeneratingTranslit(false);
    }
  }

  async function generateTtsAudio() {
    if (!selectedText || isGeneratingAudio) return;
    setIsGeneratingAudio(true);
    try {
      const res = await fetch(`/api/texts/${selectedText.id}/generate-audio`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        const updated = { ...selectedText, tts_audio_url: data.tts_audio_url, tts_provider: data.tts_provider };
        setSelectedText(updated);
        setTexts((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } catch (error) {
      console.error("Failed to generate audio:", error);
    } finally {
      setIsGeneratingAudio(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || isExtractingImage) return;

    setIsExtractingImage(true);
    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/texts/extract-from-image", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setNewText({
          title: data.title || "",
          arabic: data.arabic || "",
          translation: data.translation || "",
          category: newText.category,
        });
      } else {
        const err = await res.json();
        alert(err.error || "Failed to extract text from image");
      }
    } catch (error) {
      console.error("Failed to extract text from image:", error);
      alert("Failed to extract text from image");
    } finally {
      setIsExtractingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function playTtsAudio() {
    if (!selectedText?.tts_audio_url) return;
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
    const audio = new Audio(selectedText.tts_audio_url);
    ttsAudioRef.current = audio;
    audio.onplay = () => setIsTtsPlaying(true);
    audio.onended = () => setIsTtsPlaying(false);
    audio.onpause = () => setIsTtsPlaying(false);
    audio.play();
  }

  function stopTtsAudio() {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.currentTime = 0;
    }
    setIsTtsPlaying(false);
  }

  // Group texts by category
  const groupedTexts = texts.reduce((acc, text) => {
    const category = text.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(text);
    return acc;
  }, {} as Record<string, Text[]>);

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Text List */}
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">
                Reading Texts
              </h2>
              <button
                onClick={() => setShowModal(true)}
                className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover hover:-translate-y-px"
              >
                + Add Text
              </button>
            </div>
            {isLoading ? (
              <div className="text-center text-ink-faint">Loading...</div>
            ) : texts.length === 0 ? (
              <div className="rounded-[var(--radius-md)] border-2 border-dashed border-line p-8 text-center">
                <p className="text-ink-faint">No texts yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                >
                  Add Text
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTexts).map(([category, categoryTexts]) => (
                  <div key={category}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryTexts.map((text) => (
                        <div
                          key={text.id}
                          className={`group relative cursor-pointer rounded-[var(--radius-sm)] border p-3 transition ${
                            selectedText?.id === text.id
                              ? "border-accent bg-surface"
                              : "border-line bg-surface hover:border-ink-faint"
                          }`}
                          onClick={() => selectText(text)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="flex-1 text-right text-lg leading-relaxed text-ink"
                              dir="rtl"
                              style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                            >
                              {text.arabic.length > 60 ? text.arabic.slice(0, 60) + "..." : text.arabic}
                            </p>
                            {text.recording_url && (
                              <span className="mt-1 flex-shrink-0 text-accent">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                              </span>
                            )}
                          </div>
                          {text.title && (
                            <p className="mt-1 text-xs text-ink-faint">{text.title}</p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteText(text.id);
                            }}
                            className="absolute right-2 top-2 rounded p-1 text-ink-faint opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reading Area */}
          <div className="lg:col-span-2">
            {selectedText ? (
              <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                {selectedText.title && (
                  <h2 className="mb-4 text-lg font-semibold text-ink">
                    {selectedText.title}
                  </h2>
                )}

                {/* Arabic Text with Transliteration */}
                <div className="mb-6 rounded-[var(--radius-sm)] bg-surface-hover p-6">
                  {selectedText.arabic.split("\n").map((line, i) => {
                    const translitLines = selectedText.transliteration?.split("\n") || [];
                    return (
                      <div key={i} className={i > 0 ? "mt-4" : ""}>
                        <p
                          className="text-2xl leading-loose text-ink"
                          dir="rtl"
                          style={{ fontFamily: "var(--font-arabic), sans-serif", lineHeight: "2" }}
                        >
                          {line}
                        </p>
                        {showTransliteration && translitLines[i] && (
                          <p className="mt-0.5 text-sm italic text-ink-faint leading-relaxed">
                            {translitLines[i]}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  {/* Transliteration controls */}
                  <div className="mt-4 flex items-center gap-2 border-t border-line/50 pt-3">
                    {selectedText.transliteration ? (
                      <button
                        onClick={() => setShowTransliteration(!showTransliteration)}
                        className="text-xs text-ink-faint hover:text-ink-soft transition"
                      >
                        {showTransliteration ? "Hide transliteration" : "Show transliteration"}
                      </button>
                    ) : (
                      <button
                        onClick={generateTransliteration}
                        disabled={isGeneratingTranslit}
                        className="text-xs text-accent hover:text-accent-hover transition disabled:text-ink-faint"
                      >
                        {isGeneratingTranslit ? "Generating transliteration..." : "Generate transliteration"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Recording Controls */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  {/* Play existing recording */}
                  {selectedText.recording_url && !recorder.audioUrl && (
                    <>
                      {isPlaying ? (
                        <button
                          onClick={stopPlaying}
                          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                          </svg>
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={playRecording}
                          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Play Recording
                        </button>
                      )}
                      <button
                        onClick={deleteRecording}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}

                  {/* Recording preview */}
                  {recorder.audioUrl && (
                    <>
                      <audio src={recorder.audioUrl} controls className="h-10" />
                      <button
                        onClick={handleUploadRecording}
                        disabled={recorder.isUploading}
                        className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:bg-ink-faint"
                      >
                        {recorder.isUploading ? "Uploading..." : "Save"}
                      </button>
                      <button
                        onClick={recorder.cancelRecording}
                        className="rounded-[var(--radius-sm)] border border-line px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {/* Record Button */}
                  {!recorder.audioUrl && (
                    <>
                      {recorder.isRecording ? (
                        <button
                          onClick={recorder.stopRecording}
                          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                          <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
                          Stop Recording
                        </button>
                      ) : (
                        <button
                          onClick={handleStartRecording}
                          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-hover"
                        >
                          <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                          </svg>
                          {selectedText.recording_url ? "Re-record" : "Record"}
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* TTS Audio (ElevenLabs) */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  {selectedText.tts_audio_url ? (
                    <>
                      {isTtsPlaying ? (
                        <button
                          onClick={stopTtsAudio}
                          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                          </svg>
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={playTtsAudio}
                          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Play Audio
                        </button>
                      )}
                      <button
                        onClick={generateTtsAudio}
                        disabled={isGeneratingAudio}
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-line px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-hover disabled:text-ink-faint"
                      >
                        {isGeneratingAudio ? "Regenerating..." : "Regenerate"}
                      </button>
                      {selectedText.tts_provider && (
                        <span className="group relative inline-flex items-center justify-center h-6 w-6 rounded-full text-ink-faint hover:text-ink-soft hover:bg-surface-hover transition">
                          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded-[var(--radius-sm)] bg-ink px-2.5 py-1 text-xs text-surface opacity-0 group-hover:opacity-100 transition-opacity">
                            Generated with {selectedText.tts_provider}
                          </span>
                        </span>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={generateTtsAudio}
                      disabled={isGeneratingAudio}
                      className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-hover disabled:text-ink-faint"
                    >
                      {isGeneratingAudio ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating Audio...
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                          Generate Audio
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Translation Toggle */}
                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className="mb-4 rounded-[var(--radius-sm)] border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-hover"
                >
                  {showTranslation ? "Hide Translation" : "Show Translation"}
                </button>

                {/* Translation */}
                {showTranslation && (
                  <div className="mb-6 rounded-[var(--radius-sm)] bg-accent-subtle p-4">
                    <p className="text-ink-soft whitespace-pre-line">
                      {selectedText.translation}
                    </p>
                  </div>
                )}

                {/* Linked Vocabulary */}
                {linkedCards.length > 0 && (
                  <div className="mt-6 border-t border-line pt-6">
                    <h3 className="mb-3 text-sm font-semibold text-ink-faint">
                      Vocabulary in this text
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {linkedCards.map((card) => (
                        <span
                          key={card.id}
                          className="inline-flex items-center gap-2 rounded-full bg-accent-subtle px-3 py-1 text-sm"
                        >
                          <span
                            className="text-accent"
                            style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                          >
                            {card.front}
                          </span>
                          <span className="text-ink-soft">
                            {card.back}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-line">
                <p className="text-ink-faint">
                  Select a text to start reading
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Text Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-[var(--radius-md)] bg-surface p-6 animate-modal">
            <h2 className="text-xl font-semibold text-ink">Add Reading Text</h2>

            {/* Image upload for OCR */}
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtractingImage}
                className="w-full rounded-[var(--radius-sm)] border-2 border-dashed border-line px-4 py-3 text-sm text-ink-faint transition hover:border-accent hover:text-accent disabled:border-line disabled:text-ink-faint"
              >
                {isExtractingImage ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Extracting text from image...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload image to extract text
                  </span>
                )}
              </button>
            </div>

            <form onSubmit={createText} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-soft">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={newText.title}
                  onChange={(e) => setNewText({ ...newText, title: e.target.value })}
                  placeholder="Lesson 1 - Introduction"
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft">
                  Arabic Text
                </label>
                <textarea
                  value={newText.arabic}
                  onChange={(e) => setNewText({ ...newText, arabic: e.target.value })}
                  placeholder="أنا اسمي..."
                  rows={4}
                  dir="rtl"
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-line px-4 py-3 text-xl leading-relaxed focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft">
                  Translation
                </label>
                <textarea
                  value={newText.translation}
                  onChange={(e) => setNewText({ ...newText, translation: e.target.value })}
                  placeholder="My name is..."
                  rows={4}
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={newText.category}
                  onChange={(e) => setNewText({ ...newText, category: e.target.value })}
                  placeholder="Family Introduction"
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-[var(--radius-sm)] border border-line px-4 py-2 text-sm font-medium text-ink-soft transition hover:bg-surface-hover"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
                >
                  Add Text
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
