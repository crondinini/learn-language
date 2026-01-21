"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { PersonInfo } from "@/lib/constants";

interface VerbWithStats {
  id: number;
  root: string;
  root_transliteration: string | null;
  form: number;
  meaning: string;
  past_3ms: string;
  present_3ms: string;
  masdar: string | null;
  total_conjugations: number;
  practiced_count: number;
  mastered_count: number;
  due_count: number;
}

export default function ConjugationPage() {
  const [verbs, setVerbs] = useState<VerbWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    fetchVerbs();
  }, []);

  async function fetchVerbs() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/verbs");
      const data = await res.json();
      setVerbs(data);
      setDueCount(data.reduce((sum: number, v: VerbWithStats) => sum + v.due_count, 0));
    } catch (error) {
      console.error("Error fetching verbs:", error);
    }
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header
        actions={
          <>
            {dueCount > 0 ? (
              <Link
                href="/conjugation/review"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Practice ({dueCount})
              </Link>
            ) : verbs.length > 0 ? (
              <Link
                href="/conjugation/review"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Start Practice
              </Link>
            ) : null}
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              + Add Verb
            </button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm">
          <Link href="/" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400">
            Home
          </Link>
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 dark:text-slate-200">Conjugation</span>
        </nav>

        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Verb Conjugation</h1>
          <p className="mt-1 text-sm text-slate-500">Practice Arabic verb conjugations (Past Tense)</p>
        </div>

        {/* Verb List */}
        {isLoading ? (
          <div className="py-12 text-center text-slate-500">Loading...</div>
        ) : verbs.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 py-12 text-center dark:border-slate-600">
            <p className="mb-4 text-slate-500 dark:text-slate-400">No verbs added yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Add Your First Verb
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verbs.map((verb) => (
              <Link
                key={verb.id}
                href={`/conjugation/${verb.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-emerald-600"
              >
                <div className="mb-2 flex items-start justify-between">
                  <div dir="rtl" className="text-2xl font-bold text-slate-800 dark:text-white">
                    {verb.past_3ms}
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                    Form {verb.form}
                  </span>
                </div>
                <div className="mb-1 text-sm text-slate-600 dark:text-slate-300">{verb.meaning}</div>
                <div dir="rtl" className="mb-3 text-sm text-slate-400">
                  {verb.root} → {verb.present_3ms}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 text-xs">
                  {verb.due_count > 0 && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {verb.due_count} due
                    </span>
                  )}
                  {verb.mastered_count > 0 && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {verb.mastered_count} mastered
                    </span>
                  )}
                  {verb.practiced_count === 0 && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                      Not practiced
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Add Verb Modal */}
      {showAddModal && (
        <AddVerbModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            setShowAddModal(false);
            fetchVerbs();
          }}
        />
      )}
    </div>
  );
}

// Add Verb Modal Component
function AddVerbModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [form, setForm] = useState({
    root: "",
    root_transliteration: "",
    form: 1,
    meaning: "",
    past_3ms: "",
    present_3ms: "",
    masdar: "",
  });
  const [conjugations, setConjugations] = useState<Record<string, string>>({
    ana: "",
    nahnu: "",
    anta: "",
    anti: "",
    antum: "",
    huwa: "",
    hiya: "",
    hum: "",
    hunna: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/verbs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          past_conjugations: conjugations,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add verb");
      }

      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add verb");
    }
    setIsSubmitting(false);
  }

  const persons = Object.entries(PersonInfo).sort((a, b) => a[1].order - b[1].order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Add New Verb</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Root (ك ت ب)
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.root}
                onChange={(e) => setForm({ ...form, root: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Transliteration (k-t-b)
              </label>
              <input
                type="text"
                value={form.root_transliteration}
                onChange={(e) => setForm({ ...form, root_transliteration: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Meaning (to write)
              </label>
              <input
                type="text"
                value={form.meaning}
                onChange={(e) => setForm({ ...form, meaning: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Form (I-X)
              </label>
              <select
                value={form.form}
                onChange={(e) => setForm({ ...form, form: parseInt(e.target.value) })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    Form {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Past 3rd m.s. (كَتَبَ)
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.past_3ms}
                onChange={(e) => setForm({ ...form, past_3ms: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Present 3rd m.s. (يَكْتُبُ)
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.present_3ms}
                onChange={(e) => setForm({ ...form, present_3ms: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Masdar / Verbal Noun (كِتَابَة) - Optional
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.masdar}
                onChange={(e) => setForm({ ...form, masdar: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
          </div>

          {/* Past Tense Conjugations */}
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-800 dark:text-white">
              Past Tense Conjugations
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {persons.map(([key, info]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="w-24 text-sm text-slate-500 dark:text-slate-400">
                    {info.arabic} ({info.english})
                  </span>
                  <input
                    type="text"
                    dir="rtl"
                    value={conjugations[key]}
                    onChange={(e) => setConjugations({ ...conjugations, [key]: e.target.value })}
                    placeholder={key === "huwa" ? form.past_3ms : ""}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-lg dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Verb"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
