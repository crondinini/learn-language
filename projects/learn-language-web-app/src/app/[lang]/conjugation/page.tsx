"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { PersonInfo } from "@/lib/constants";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";

interface VerbWithStats {
  id: number;
  root: string;
  root_transliteration: string | null;
  form: number;
  meaning: string;
  past_3ms: string;
  present_3ms: string;
  masdar: string | null;
  is_colloquial: number;
  total_conjugations: number;
  practiced_count: number;
  mastered_count: number;
  due_count: number;
}

export default function ConjugationPage() {
  const lang = useFeatureGuard("conjugation");
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
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm">
          <Link href={`/${lang}`} className="text-ink-faint hover:text-accent">
            Home
          </Link>
          <svg className="h-4 w-4 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-ink">Conjugation</span>
        </nav>

        {/* Page Title */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-ink">Verb Conjugation</h1>
            <p className="mt-1 text-sm text-ink-faint">Practice Arabic verb conjugations</p>
          </div>
          <div className="flex gap-2">
            {dueCount > 0 ? (
              <Link
                href={`/${lang}/conjugation/review`}
                className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover hover:-translate-y-px"
              >
                Practice ({dueCount})
              </Link>
            ) : verbs.length > 0 ? (
              <Link
                href={`/${lang}/conjugation/review`}
                className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover hover:-translate-y-px"
              >
                Start Practice
              </Link>
            ) : null}
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover hover:-translate-y-px"
            >
              + Add Verb
            </button>
          </div>
        </div>

        {/* Verb List */}
        {isLoading ? (
          <div className="py-12 text-center text-ink-faint">Loading...</div>
        ) : verbs.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border-2 border-dashed border-line py-12 text-center">
            <p className="mb-4 text-ink-faint">No verbs added yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
            >
              Add Your First Verb
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verbs.map((verb) => (
              <Link
                key={verb.id}
                href={`/${lang}/conjugation/${verb.id}`}
                className="group rounded-[var(--radius-md)] border border-line/50 bg-surface p-4 transition-all hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-0.5"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div dir="rtl" className="text-2xl font-bold text-ink">
                    {verb.past_3ms}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {verb.is_colloquial === 1 && (
                      <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-ink-soft">
                        Colloquial
                      </span>
                    )}
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs text-ink-faint">
                      Form {verb.form}
                    </span>
                  </div>
                </div>
                <div className="mb-1 text-sm text-ink-soft">{verb.meaning}</div>
                <div dir="rtl" className="mb-3 text-sm text-ink-faint">
                  {verb.root} → {verb.present_3ms}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 text-xs">
                  {verb.due_count > 0 && (
                    <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-accent">
                      {verb.due_count} due
                    </span>
                  )}
                  {verb.mastered_count > 0 && (
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-ink-soft">
                      {verb.mastered_count} mastered
                    </span>
                  )}
                  {verb.practiced_count === 0 && (
                    <span className="rounded-full bg-surface-hover px-2 py-0.5 text-ink-faint">
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
    is_colloquial: false,
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
  const [presentConjugations, setPresentConjugations] = useState<Record<string, string>>({
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
          present_conjugations: presentConjugations,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="animate-modal max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-md)] bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">Add New Verb</h2>
          <button onClick={onClose} className="text-ink-faint hover:text-ink-soft">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">
                Root (ك ت ب)
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.root}
                onChange={(e) => setForm({ ...form, root: e.target.value })}
                className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 text-lg"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">
                Transliteration (k-t-b)
              </label>
              <input
                type="text"
                value={form.root_transliteration}
                onChange={(e) => setForm({ ...form, root_transliteration: e.target.value })}
                className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">
                Meaning (to write)
              </label>
              <input
                type="text"
                value={form.meaning}
                onChange={(e) => setForm({ ...form, meaning: e.target.value })}
                className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">
                Form (I-X)
              </label>
              <select
                value={form.form}
                onChange={(e) => setForm({ ...form, form: parseInt(e.target.value) })}
                className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-2"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    Form {n}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">
                Past 3rd m.s. (كَتَبَ)
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.past_3ms}
                onChange={(e) => setForm({ ...form, past_3ms: e.target.value })}
                className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 text-lg"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-ink-soft">
                Present 3rd m.s. (يَكْتُبُ)
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.present_3ms}
                onChange={(e) => setForm({ ...form, present_3ms: e.target.value })}
                className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 text-lg"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-ink-soft">
                Masdar / Verbal Noun (كِتَابَة) - Optional
              </label>
              <input
                type="text"
                dir="rtl"
                value={form.masdar}
                onChange={(e) => setForm({ ...form, masdar: e.target.value })}
                className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-2 text-lg"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <input
                  type="checkbox"
                  checked={form.is_colloquial}
                  onChange={(e) => setForm({ ...form, is_colloquial: e.target.checked })}
                  className="h-4 w-4 rounded border-line text-amber-600 focus:ring-amber-500"
                />
                Colloquial / Levantine (not MSA)
              </label>
            </div>
          </div>

          {/* Conjugations */}
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-ink">
              Conjugations
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th className="pb-2 text-left font-medium text-ink-faint">Pronoun</th>
                    <th className="pb-2 text-right font-medium text-ink-faint">Past</th>
                    <th className="pb-2 text-right font-medium text-ink-faint">Present</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map(([key, info]) => (
                    <tr key={key}>
                      <td className="py-1.5 text-ink-faint">
                        {info.arabic} ({info.english})
                      </td>
                      <td className="py-1.5">
                        <input
                          type="text"
                          dir="rtl"
                          value={conjugations[key]}
                          onChange={(e) => setConjugations({ ...conjugations, [key]: e.target.value })}
                          placeholder={key === "huwa" ? form.past_3ms : ""}
                          className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-lg"
                        />
                      </td>
                      <td className="py-1.5 pl-2">
                        <input
                          type="text"
                          dir="rtl"
                          value={presentConjugations[key]}
                          onChange={(e) => setPresentConjugations({ ...presentConjugations, [key]: e.target.value })}
                          placeholder={key === "huwa" ? form.present_3ms : ""}
                          className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-lg"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-[var(--radius-sm)] bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-sm)] border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-[var(--radius-sm)] bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {isSubmitting ? "Adding..." : "Add Verb"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
