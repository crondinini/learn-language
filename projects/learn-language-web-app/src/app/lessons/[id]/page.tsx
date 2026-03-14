"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";

interface Card {
  id: number;
  front: string;
  back: string;
  notes: string | null;
  deck_name: string;
}

interface Lesson {
  id: number;
  title: string;
  lesson_date: string;
  transcript: string;
  summary: string | null;
  grammar_notes: string | null;
  notes: string | null;
  session_id: string | null;
  cards: Card[];
}

interface LogEntry {
  type: "status" | "text" | "tool" | "tool_start" | "result" | "error" | "init" | "cards_linked";
  content?: string;
  tool?: string;
  input?: string;
  sessionId?: string;
  cost?: number;
  duration?: number;
  count?: number;
}

export default function LessonDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Editable fields
  const [title, setTitle] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [showTranscript, setShowTranscript] = useState(false);

  // Summarize state
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summarizeStream, setSummarizeStream] = useState("");

  // Generate cards state
  const [generateMessage, setGenerateMessage] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateLogs, setGenerateLogs] = useState<LogEntry[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const generateOutputRef = useRef<HTMLDivElement>(null);

  // Save debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLesson = useCallback(async () => {
    const res = await fetch(`/api/lessons/${id}`);
    if (res.ok) {
      const data = await res.json();
      setLesson(data);
      setTitle(data.title);
      setLessonDate(data.lesson_date);
      setTranscript(data.transcript);
      setNotes(data.notes || "");
    }
    setIsLoading(false);
  }, [id]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  function debouncedSave(field: string, value: string) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      fetch(`/api/lessons/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
    }, 800);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    debouncedSave("title", value);
  }

  function handleDateChange(value: string) {
    setLessonDate(value);
    debouncedSave("lesson_date", value);
  }

  function handleTranscriptChange(value: string) {
    setTranscript(value);
    debouncedSave("transcript", value);
  }

  function handleNotesChange(value: string) {
    setNotes(value);
    debouncedSave("notes", value);
  }

  function scrollGenerateToBottom() {
    setTimeout(() => {
      if (generateOutputRef.current) {
        generateOutputRef.current.scrollTop = generateOutputRef.current.scrollHeight;
      }
    }, 0);
  }

  async function handleSummarize() {
    setIsSummarizing(true);
    setSummarizeStream("");

    // Save transcript first
    await fetch(`/api/lessons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });

    try {
      const res = await fetch(`/api/lessons/${id}/summarize`, { method: "POST" });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to summarize");
        setIsSummarizing(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setIsSummarizing(false); return; }

      let buffer = "";
      let currentText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.type === "delta") {
              currentText += event.content;
              setSummarizeStream(currentText);
            } else if (event.type === "result" || event.type === "done") {
              // Refresh lesson data to get saved summary
              await fetchLesson();
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      alert("Failed to summarize: " + String(error));
    } finally {
      setIsSummarizing(false);
      setSummarizeStream("");
    }
  }

  async function handleGenerate() {
    if (!generateMessage.trim()) return;

    setIsGenerating(true);
    setGenerateLogs([]);
    setStreamingText("");

    const msgToSend = generateMessage;
    setGenerateMessage("");

    try {
      const res = await fetch(`/api/lessons/${id}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msgToSend }),
      });

      if (!res.ok) {
        const err = await res.json();
        setGenerateLogs([{ type: "error", content: err.error || "Failed to generate" }]);
        setIsGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) { setIsGenerating(false); return; }

      let buffer = "";
      let currentText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "delta") {
              currentText += event.content;
              setStreamingText(currentText);
              scrollGenerateToBottom();
            } else if (event.type === "tool_start") {
              if (currentText) {
                setGenerateLogs((prev) => [...prev, { type: "text", content: currentText }]);
                currentText = "";
                setStreamingText("");
              }
              setGenerateLogs((prev) => [...prev, { type: "tool_start", tool: event.tool }]);
              scrollGenerateToBottom();
            } else if (event.type === "tool") {
              setGenerateLogs((prev) => [...prev, { type: "tool", tool: event.tool, input: event.input }]);
              scrollGenerateToBottom();
            } else if (event.type === "block_end") {
              if (currentText) {
                setGenerateLogs((prev) => [...prev, { type: "text", content: currentText }]);
                currentText = "";
                setStreamingText("");
              }
            } else if (event.type === "result") {
              if (currentText) {
                setGenerateLogs((prev) => [...prev, { type: "text", content: currentText }]);
                currentText = "";
                setStreamingText("");
              }
              setGenerateLogs((prev) => [
                ...prev,
                { type: "result", content: event.content, cost: event.cost, duration: event.duration },
              ]);
              scrollGenerateToBottom();
            } else if (event.type === "cards_linked") {
              setGenerateLogs((prev) => [
                ...prev,
                { type: "cards_linked", count: event.count },
              ]);
            } else if (event.type === "error") {
              setGenerateLogs((prev) => [...prev, { type: "error", content: event.content }]);
            } else if (event.type === "status") {
              setGenerateLogs((prev) => [...prev, { type: "status", content: event.content }]);
            } else if (event.type === "done") {
              break;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      setGenerateLogs((prev) => [...prev, { type: "error", content: String(error) }]);
    } finally {
      setIsGenerating(false);
      fetchLesson();
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
          <div className="text-center text-ink-faint">Loading...</div>
        </main>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
          <div className="text-center text-ink-faint">Lesson not found</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20 space-y-6">
        {/* Title + Date */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="flex-1 rounded-[var(--radius-sm)] border border-transparent bg-transparent px-2 py-1 text-2xl font-bold text-ink hover:border-line focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="date"
            value={lessonDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {lesson.cards.length > 0 && (
            <Link
              href={`/lessons/${id}/study`}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-1.5 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Study ({lesson.cards.length})
            </Link>
          )}
        </div>

        {/* Transcript */}
        <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface" style={{ boxShadow: "var(--shadow-card)" }}>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex w-full items-center justify-between px-6 py-4"
          >
            <h2 className="text-sm font-semibold text-ink-soft">
              Transcript
              {transcript && (
                <span className="ml-2 text-xs font-normal text-ink-faint">
                  ({transcript.length} chars)
                </span>
              )}
            </h2>
            <svg
              className={`h-4 w-4 text-ink-faint transition-transform ${showTranscript ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showTranscript && (
            <div className="border-t border-line px-6 py-4">
              <textarea
                value={transcript}
                onChange={(e) => handleTranscriptChange(e.target.value)}
                placeholder="Paste your class transcript here..."
                rows={12}
                className="w-full rounded-[var(--radius-sm)] border border-line px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          )}
        </div>

        {/* Summarize button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSummarize}
            disabled={isSummarizing || !transcript.trim()}
            className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSummarizing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Summarizing...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {lesson.summary ? "Re-summarize" : "Summarize Transcript"}
              </>
            )}
          </button>
          {lesson.summary && (
            <span className="text-xs text-ink-faint">Summary saved</span>
          )}
        </div>

        {/* Summarize streaming output */}
        {isSummarizing && summarizeStream && (
          <div className="rounded-[var(--radius-md)] border border-line bg-surface-hover p-6">
            <div className="whitespace-pre-wrap text-sm text-ink-soft">
              {summarizeStream}
              <span className="inline-block h-4 w-1 animate-pulse bg-accent" />
            </div>
          </div>
        )}

        {/* Summary section */}
        {lesson.summary && !isSummarizing && (
          <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h2 className="mb-3 text-sm font-semibold text-ink-soft">Summary</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {lesson.summary}
            </div>
          </div>
        )}

        {/* Grammar Notes section */}
        {lesson.grammar_notes && !isSummarizing && (
          <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h2 className="mb-3 text-sm font-semibold text-ink-soft">Grammar Notes</h2>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
              {lesson.grammar_notes}
            </div>
          </div>
        )}

        {/* Generate Cards section */}
        <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="mb-3 text-sm font-semibold text-ink-soft">
            Generate Cards
            {lesson.session_id && (
              <span className="ml-2 rounded bg-surface-hover px-2 py-0.5 text-xs font-mono font-normal text-ink-faint">
                Session: {lesson.session_id.slice(0, 8)}
              </span>
            )}
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={generateMessage}
              onChange={(e) => setGenerateMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
              placeholder={
                lesson.session_id
                  ? "Send a follow-up message (e.g. 'also add the colors we discussed')..."
                  : "What cards should be created? (e.g. 'Create cards for all vocabulary from this class')..."
              }
              disabled={isGenerating}
              className="flex-1 rounded-[var(--radius-sm)] border border-line px-4 py-2 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
            <button
              onClick={handleGenerate}
              disabled={!generateMessage.trim() || isGenerating}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Working...
                </>
              ) : (
                "Send"
              )}
            </button>
          </div>

          {/* Generate output */}
          {(generateLogs.length > 0 || isGenerating) && (
            <div
              ref={generateOutputRef}
              className="mt-4 max-h-[400px] overflow-auto rounded-[var(--radius-sm)] border border-line p-4 space-y-2"
            >
              {generateLogs.map((entry, i) => {
                if (entry.type === "text") {
                  return (
                    <div key={i} className="whitespace-pre-wrap text-sm text-ink-soft">
                      {entry.content}
                    </div>
                  );
                }
                if (entry.type === "tool_start") {
                  return (
                    <div key={i} className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface-hover px-4 py-2">
                      <svg className="h-4 w-4 flex-shrink-0 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs font-medium text-ink-soft">
                        Running: {entry.tool}
                      </span>
                    </div>
                  );
                }
                if (entry.type === "tool") {
                  return (
                    <div key={i} className="rounded-[var(--radius-sm)] border border-line bg-surface-hover px-4 py-2">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 flex-shrink-0 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs font-medium text-ink-soft">{entry.tool}</span>
                      </div>
                      {entry.input && (
                        <pre className="mt-1 max-h-24 overflow-auto text-xs text-ink-soft">{entry.input}</pre>
                      )}
                    </div>
                  );
                }
                if (entry.type === "result") {
                  return (
                    <div key={i} className="rounded-[var(--radius-sm)] border border-accent bg-accent-subtle px-4 py-3">
                      <div className="whitespace-pre-wrap text-sm text-ink">
                        {entry.content}
                      </div>
                      {(entry.cost || entry.duration) && (
                        <div className="mt-2 flex gap-4 text-xs text-accent">
                          {entry.duration && <span>{Math.round(entry.duration / 1000)}s</span>}
                          {entry.cost && <span>${entry.cost.toFixed(4)}</span>}
                        </div>
                      )}
                    </div>
                  );
                }
                if (entry.type === "cards_linked") {
                  return (
                    <div key={i} className="rounded-[var(--radius-sm)] border border-accent bg-accent-subtle px-4 py-2 text-sm text-accent">
                      {entry.count} card{entry.count !== 1 ? "s" : ""} linked to this lesson
                    </div>
                  );
                }
                if (entry.type === "error") {
                  return (
                    <div key={i} className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                      {entry.content}
                    </div>
                  );
                }
                if (entry.type === "status") {
                  return (
                    <div key={i} className="text-xs italic text-ink-faint">{entry.content}</div>
                  );
                }
                return null;
              })}
              {streamingText && (
                <div className="whitespace-pre-wrap text-sm text-ink-soft">
                  {streamingText}
                  <span className="inline-block h-4 w-1 animate-pulse bg-accent" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cards linked to this lesson */}
        {lesson.cards.length > 0 && (
          <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
            <h2 className="mb-3 text-sm font-semibold text-ink-soft">
              Cards from this lesson ({lesson.cards.length})
            </h2>
            <div className="space-y-2">
              {lesson.cards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-line px-4 py-2"
                >
                  <div className="flex items-center gap-4">
                    <span
                      className="text-lg text-ink"
                      dir="rtl"
                      style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                    >
                      {card.front}
                    </span>
                    <span className="text-sm text-ink-faint">{card.back}</span>
                  </div>
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-ink-faint">
                    {card.deck_name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes section */}
        <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <h2 className="mb-3 text-sm font-semibold text-ink-soft">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Your personal notes about this lesson..."
            rows={4}
            className="w-full rounded-[var(--radius-sm)] border border-line px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </main>
    </div>
  );
}
