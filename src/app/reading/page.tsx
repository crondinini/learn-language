"use client";

import { useState, useEffect, useRef } from "react";
import { useRecorder } from "@/hooks/useRecorder";
import Header from "@/components/Header";

interface Text {
  id: number;
  title: string | null;
  arabic: string;
  translation: string;
  category: string | null;
  recording_url: string | null;
  created_at: string;
}

interface Card {
  id: number;
  front: string;
  back: string;
}

export default function ReadingPage() {
  const [texts, setTexts] = useState<Text[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedText, setSelectedText] = useState<Text | null>(null);
  const [linkedCards, setLinkedCards] = useState<Card[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newText, setNewText] = useState({ title: "", arabic: "", translation: "", category: "" });
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use shared recorder hook
  const recorder = useRecorder();

  useEffect(() => {
    fetchTexts();
  }, []);

  async function fetchTexts() {
    const res = await fetch("/api/texts");
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

  // Group texts by category
  const groupedTexts = texts.reduce((acc, text) => {
    const category = text.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(text);
    return acc;
  }, {} as Record<string, Text[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            + Add Text
          </button>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Text List */}
          <div className="lg:col-span-1">
            <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">
              Reading Texts
            </h2>
            {isLoading ? (
              <div className="text-center text-slate-500">Loading...</div>
            ) : texts.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 p-8 text-center dark:border-slate-600">
                <p className="text-slate-500 dark:text-slate-400">No texts yet</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Add Text
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedTexts).map(([category, categoryTexts]) => (
                  <div key={category}>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryTexts.map((text) => (
                        <div
                          key={text.id}
                          className={`group relative cursor-pointer rounded-lg border p-3 transition ${
                            selectedText?.id === text.id
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
                          }`}
                          onClick={() => selectText(text)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p
                              className="flex-1 text-right text-lg leading-relaxed text-slate-800 dark:text-white"
                              dir="rtl"
                              style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                            >
                              {text.arabic.length > 60 ? text.arabic.slice(0, 60) + "..." : text.arabic}
                            </p>
                            {text.recording_url && (
                              <span className="mt-1 flex-shrink-0 text-emerald-500">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.369 4.369 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                                </svg>
                              </span>
                            )}
                          </div>
                          {text.title && (
                            <p className="mt-1 text-xs text-slate-500">{text.title}</p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteText(text.id);
                            }}
                            className="absolute right-2 top-2 rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
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
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                {selectedText.title && (
                  <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-white">
                    {selectedText.title}
                  </h2>
                )}

                {/* Arabic Text */}
                <div className="mb-6 rounded-lg bg-slate-50 p-6 dark:bg-slate-900">
                  <p
                    className="text-2xl leading-loose text-slate-800 dark:text-white"
                    dir="rtl"
                    style={{ fontFamily: "var(--font-arabic), sans-serif", lineHeight: "2.5" }}
                  >
                    {selectedText.arabic}
                  </p>
                </div>

                {/* Recording Controls */}
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  {/* Play existing recording */}
                  {selectedText.recording_url && !recorder.audioUrl && (
                    <>
                      {isPlaying ? (
                        <button
                          onClick={stopPlaying}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                          </svg>
                          Stop
                        </button>
                      ) : (
                        <button
                          onClick={playRecording}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                          </svg>
                          Play Recording
                        </button>
                      )}
                      <button
                        onClick={deleteRecording}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
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
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:bg-slate-400"
                      >
                        {recorder.isUploading ? "Uploading..." : "Save"}
                      </button>
                      <button
                        onClick={recorder.cancelRecording}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
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
                          className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
                        >
                          <span className="h-3 w-3 animate-pulse rounded-full bg-white" />
                          Stop Recording
                        </button>
                      ) : (
                        <button
                          onClick={handleStartRecording}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
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

                {/* Translation Toggle */}
                <button
                  onClick={() => setShowTranslation(!showTranslation)}
                  className="mb-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  {showTranslation ? "Hide Translation" : "Show Translation"}
                </button>

                {/* Translation */}
                {showTranslation && (
                  <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                    <p className="text-slate-700 dark:text-slate-300 whitespace-pre-line">
                      {selectedText.translation}
                    </p>
                  </div>
                )}

                {/* Linked Vocabulary */}
                {linkedCards.length > 0 && (
                  <div className="mt-6 border-t border-slate-200 pt-6 dark:border-slate-700">
                    <h3 className="mb-3 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      Vocabulary in this text
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {linkedCards.map((card) => (
                        <span
                          key={card.id}
                          className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-sm dark:bg-emerald-900/30"
                        >
                          <span
                            className="text-emerald-800 dark:text-emerald-300"
                            style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                          >
                            {card.front}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {card.back}
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600">
                <p className="text-slate-500 dark:text-slate-400">
                  Select a text to start reading
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Text Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">Add Reading Text</h2>
            <form onSubmit={createText} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={newText.title}
                  onChange={(e) => setNewText({ ...newText, title: e.target.value })}
                  placeholder="Lesson 1 - Introduction"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Arabic Text
                </label>
                <textarea
                  value={newText.arabic}
                  onChange={(e) => setNewText({ ...newText, arabic: e.target.value })}
                  placeholder="أنا اسمي..."
                  rows={4}
                  dir="rtl"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-3 text-xl leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Translation
                </label>
                <textarea
                  value={newText.translation}
                  onChange={(e) => setNewText({ ...newText, translation: e.target.value })}
                  placeholder="My name is..."
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={newText.category}
                  onChange={(e) => setNewText({ ...newText, category: e.target.value })}
                  placeholder="Family Introduction"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
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
