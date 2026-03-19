"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import mammoth from "mammoth";
import Header from "@/components/Header";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";

const languageNames: Record<string, string> = {
  ar: "Arabic",
  en: "English",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  zh: "Chinese",
  ko: "Korean",
};

type InputMode = "paste" | "upload";

interface LogEntry {
  type: "status" | "text" | "tool" | "tool_start" | "result" | "error" | "init";
  content?: string;
  tool?: string;
  input?: string;
  sessionId?: string;
  cost?: number;
  duration?: number;
}

interface GenerationRecord {
  id: number;
  session_id: string;
  input_words: string;
  result: string | null;
  cost: number | null;
  duration: number | null;
  created_at: string;
}

export default function GeneratePage() {
  useFeatureGuard("generate");
  const params = useParams();
  const lang = params.lang as string;
  const langName = languageNames[lang] || lang;
  const isArabic = lang === "ar";
  const [inputMode, setInputMode] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/generations");
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (file.name.endsWith(".docx")) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result;
        if (arrayBuffer instanceof ArrayBuffer) {
          const { value } = await mammoth.extractRawText({ arrayBuffer });
          setText(value);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === "string") {
          setText(content);
        }
      };
      reader.readAsText(file);
    }
  }

  function parseWords(): string[] {
    return text
      .split(/[\n,;]+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 0);
  }

  function scrollToBottom() {
    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollTop = outputRef.current.scrollHeight;
      }
    }, 0);
  }

  async function handleGenerate() {
    const words = parseWords();
    if (words.length === 0) return;

    setIsGenerating(true);
    setLogs([]);
    setStreamingText("");
    setSessionId(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words, instructions: instructions || undefined, language: lang }),
      });

      if (!res.ok) {
        const err = await res.json();
        setLogs([{ type: "error", content: err.error || "Something went wrong" }]);
        setIsGenerating(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setLogs([{ type: "error", content: "No response stream" }]);
        setIsGenerating(false);
        return;
      }

      let buffer = "";
      let currentText = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);

            if (event.type === "init") {
              setSessionId(event.sessionId);
            } else if (event.type === "delta") {
              currentText += event.content;
              setStreamingText(currentText);
              scrollToBottom();
            } else if (event.type === "tool_start") {
              if (currentText) {
                setLogs((prev) => [...prev, { type: "text", content: currentText }]);
                currentText = "";
                setStreamingText("");
              }
              setLogs((prev) => [
                ...prev,
                { type: "tool_start", tool: event.tool },
              ]);
              scrollToBottom();
            } else if (event.type === "tool") {
              setLogs((prev) => [
                ...prev,
                { type: "tool", tool: event.tool, input: event.input },
              ]);
              scrollToBottom();
            } else if (event.type === "block_end") {
              if (currentText) {
                setLogs((prev) => [...prev, { type: "text", content: currentText }]);
                currentText = "";
                setStreamingText("");
              }
            } else if (event.type === "result") {
              if (currentText) {
                setLogs((prev) => [...prev, { type: "text", content: currentText }]);
                currentText = "";
                setStreamingText("");
              }
              setLogs((prev) => [
                ...prev,
                {
                  type: "result",
                  content: event.content,
                  sessionId: event.sessionId,
                  cost: event.cost,
                  duration: event.duration,
                },
              ]);
              scrollToBottom();
            } else if (event.type === "error") {
              setLogs((prev) => [...prev, { type: "error", content: event.content }]);
              scrollToBottom();
            } else if (event.type === "done") {
              streamDone = true;
              break;
            } else if (event.type === "status") {
              setLogs((prev) => [...prev, { type: "status", content: event.content }]);
              scrollToBottom();
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (error) {
      setLogs((prev) => [...prev, { type: "error", content: String(error) }]);
    } finally {
      setIsGenerating(false);
      fetchHistory();
    }
  }

  const wordCount = parseWords().length;

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
        <div className="mb-8">
          <h1 className="text-[28px] font-bold tracking-tight text-ink">
            Generate Vocabulary
          </h1>
          <p className="mt-1 text-sm text-ink-faint">
            {isArabic
              ? "Enter English words and Claude will translate them to Arabic and add them to the best matching deck."
              : `Enter words and Claude will create flashcards and add them to the best matching ${langName} deck.`}
          </p>
        </div>

        <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          {/* Input mode toggle */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setInputMode("paste")}
              className={`rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition ${
                inputMode === "paste"
                  ? "bg-accent text-white"
                  : "bg-surface-hover text-ink-soft hover:bg-surface-active"
              }`}
            >
              Paste Text
            </button>
            <button
              onClick={() => setInputMode("upload")}
              className={`rounded-[var(--radius-sm)] px-4 py-2 text-sm font-medium transition ${
                inputMode === "upload"
                  ? "bg-accent text-white"
                  : "bg-surface-hover text-ink-soft hover:bg-surface-active"
              }`}
            >
              Upload File
            </button>
          </div>

          {/* Input area */}
          {inputMode === "paste" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isArabic
                  ? "Enter English words separated by commas or newlines...\n\nExample:\nbook, table, chair\nwindow\ndoor"
                  : "Enter words separated by commas or newlines...\n\nExample:\nbook, table, chair\nwindow\ndoor"
              }
              rows={6}
              disabled={isGenerating}
              className="w-full rounded-[var(--radius-sm)] border border-line px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
          ) : (
            <div className="space-y-3">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-line p-8 transition hover:border-accent hover:bg-accent-subtle/50">
                <svg
                  className="mb-2 h-8 w-8 text-ink-faint"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <span className="text-sm text-ink-faint">
                  {fileName ? fileName : "Click to upload a text file"}
                </span>
                <input
                  type="file"
                  accept=".txt,.csv,.text,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {text && (
                <div className="rounded-[var(--radius-sm)] bg-surface-hover p-4">
                  <p className="mb-2 text-xs font-medium text-ink-faint">
                    File contents:
                  </p>
                  <pre className="max-h-40 overflow-auto text-sm text-ink-soft">
                    {text}
                  </pre>
                </div>
              )}
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions for Claude (e.g. &quot;extract the nouns from this text&quot;, &quot;only add words from page 2&quot;)..."
                rows={3}
                disabled={isGenerating}
                className="w-full rounded-[var(--radius-sm)] border border-line px-4 py-3 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
              />
            </div>
          )}

          {/* Word count and generate button */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-ink-faint">
              {wordCount > 0
                ? `${wordCount} word${wordCount !== 1 ? "s" : ""} detected`
                : "No words entered"}
            </p>
            <button
              onClick={handleGenerate}
              disabled={wordCount === 0 || isGenerating}
              className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] bg-accent px-6 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                "Generate"
              )}
            </button>
          </div>
        </div>

        {/* Output section */}
        {(logs.length > 0 || isGenerating) && (
          <div className="mt-6 rounded-[var(--radius-md)] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-6 py-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold text-ink-soft">
                  Output
                </h2>
                {sessionId && (
                  <span className="rounded bg-surface-hover px-2 py-0.5 text-xs font-mono text-ink-faint">
                    {sessionId.slice(0, 8)}
                  </span>
                )}
              </div>
              {isGenerating && (
                <span className="flex items-center gap-2 text-xs text-accent">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                  Claude is working...
                </span>
              )}
            </div>
            <div
              ref={outputRef}
              className="max-h-[500px] overflow-auto p-4 space-y-2"
            >
              {logs.map((entry, i) => {
                if (entry.type === "text") {
                  return (
                    <div
                      key={i}
                      className="whitespace-pre-wrap text-sm text-ink-soft"
                    >
                      {entry.content}
                    </div>
                  );
                }
                if (entry.type === "tool_start") {
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-line bg-surface-hover px-4 py-2"
                    >
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-ink-faint"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="text-xs font-medium text-ink-soft">
                        Running: {entry.tool}
                      </span>
                    </div>
                  );
                }
                if (entry.type === "tool") {
                  return (
                    <div
                      key={i}
                      className="rounded-[var(--radius-sm)] border border-line bg-surface-hover px-4 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-ink-faint"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-xs font-medium text-ink-soft">
                          {entry.tool}
                        </span>
                      </div>
                      {entry.input && (
                        <pre className="mt-1 max-h-24 overflow-auto text-xs text-ink-soft">
                          {entry.input}
                        </pre>
                      )}
                    </div>
                  );
                }
                if (entry.type === "status") {
                  return (
                    <div key={i} className="text-xs italic text-ink-faint">
                      {entry.content}
                    </div>
                  );
                }
                if (entry.type === "result") {
                  return (
                    <div
                      key={i}
                      className="rounded-[var(--radius-sm)] border border-accent bg-accent-subtle px-4 py-3"
                    >
                      <div className="whitespace-pre-wrap text-sm text-ink">
                        {entry.content}
                      </div>
                      {(entry.cost || entry.duration) && (
                        <div className="mt-2 flex gap-4 text-xs text-accent">
                          {entry.duration && (
                            <span>
                              {Math.round(entry.duration / 1000)}s
                            </span>
                          )}
                          {entry.cost && (
                            <span>${entry.cost.toFixed(4)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
                if (entry.type === "error") {
                  return (
                    <div
                      key={i}
                      className="rounded-[var(--radius-sm)] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600"
                    >
                      {entry.content}
                    </div>
                  );
                }
                return null;
              })}
              {/* Currently streaming text */}
              {streamingText && (
                <div className="whitespace-pre-wrap text-sm text-ink-soft">
                  {streamingText}
                  <span className="inline-block h-4 w-1 animate-pulse bg-accent" />
                </div>
              )}
            </div>
          </div>
        )}
        {/* History section */}
        {history.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-ink-soft">
              History
            </h2>
            <div className="space-y-3">
              {history.map((gen) => {
                const words: string[] = (() => {
                  try { return JSON.parse(gen.input_words); } catch { return []; }
                })();
                const isExpanded = expandedId === gen.id;
                return (
                  <div
                    key={gen.id}
                    className="rounded-[var(--radius-md)] border border-line bg-surface"
                    style={{ boxShadow: "var(--shadow-card)" }}
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : gen.id)}
                      className="flex w-full items-start justify-between px-5 py-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {words.map((w, i) => (
                            <span
                              key={i}
                              className="inline-block rounded-full bg-surface-hover px-2.5 py-0.5 text-xs font-medium text-ink-soft"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-ink-faint">
                          <span>
                            {new Date(gen.created_at + "Z").toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {gen.duration != null && (
                            <span>{Math.round(gen.duration / 1000)}s</span>
                          )}
                          {gen.cost != null && (
                            <span>${gen.cost.toFixed(4)}</span>
                          )}
                        </div>
                      </div>
                      <svg
                        className={`ml-3 mt-1 h-4 w-4 flex-shrink-0 text-ink-faint transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {isExpanded && gen.result && (
                      <div className="border-t border-line px-5 py-4">
                        <pre className="whitespace-pre-wrap text-sm text-ink-soft">
                          {gen.result}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
