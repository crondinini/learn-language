"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Header from "@/components/Header";

interface Lesson {
  id: number;
  title: string;
  lesson_date: string;
  transcript: string;
  summary: string | null;
  notes: string | null;
  created_at: string;
}

export default function LessonsPage() {
  const params = useParams();
  const lang = params.lang as string;
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchLessons();
  }, []);

  async function fetchLessons() {
    const res = await fetch("/api/lessons");
    const data = await res.json();
    setLessons(data);
    setIsLoading(false);
  }

  async function createLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    const res = await fetch("/api/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, lesson_date: newDate }),
    });

    if (res.ok) {
      const lesson = await res.json();
      setShowModal(false);
      setNewTitle("");
      setNewDate(new Date().toISOString().split("T")[0]);
      // Navigate to the new lesson
      window.location.href = `/${lang}/lessons/${lesson.id}`;
    }
  }

  async function deleteLesson(id: number) {
    if (!confirm("Delete this lesson?")) return;
    await fetch(`/api/lessons/${id}`, { method: "DELETE" });
    fetchLessons();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-ink">Lessons</h1>
            <p className="mt-1 text-sm text-ink-faint">
              Class transcripts, summaries, and generated vocabulary cards
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover hover:-translate-y-px"
          >
            + New Lesson
          </button>
        </div>

        {isLoading ? (
          <div className="text-center text-ink-faint">Loading...</div>
        ) : lessons.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border-2 border-dashed border-line p-12 text-center">
            <p className="text-lg text-ink-faint">No lessons yet</p>
            <p className="mt-1 text-sm text-ink-faint">
              Create your first lesson from a class transcript
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              Create Lesson
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-[var(--radius-md)] border border-line/50 bg-surface transition hover:shadow-md"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-start justify-between p-5">
                  <Link href={`/${lang}/lessons/${lesson.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-ink">
                        {lesson.title}
                      </h2>
                      {lesson.summary && (
                        <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-xs font-medium text-accent">
                          Summarized
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink-faint">
                      {formatDate(lesson.lesson_date)}
                      {lesson.transcript && (
                        <span className="ml-3 text-ink-faint">
                          {lesson.transcript.length > 100
                            ? lesson.transcript.slice(0, 100) + "..."
                            : lesson.transcript}
                        </span>
                      )}
                    </p>
                  </Link>
                  <button
                    onClick={() => deleteLesson(lesson.id)}
                    className="ml-3 rounded p-1 text-ink-faint transition hover:bg-red-50 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Lesson Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-[var(--radius-md)] bg-surface p-6 animate-modal">
            <h2 className="text-xl font-semibold text-ink">New Lesson</h2>
            <form onSubmit={createLesson} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-soft">
                  Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Class 12 - Colors and descriptions"
                  className="mt-1 w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink-soft">
                  Date
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
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
                  disabled={!newTitle.trim() || !newDate}
                  className="flex-1 rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
