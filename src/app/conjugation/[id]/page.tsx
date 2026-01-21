"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { PersonInfo } from "@/lib/constants";

interface VerbConjugation {
  id: number;
  verb_id: number;
  tense: string;
  person: string;
  pronoun_arabic: string;
  conjugated_form: string;
  audio_url: string | null;
  progress: {
    id: number;
    state: number;
    reps: number;
    due: string;
    last_review: string | null;
  } | null;
}

interface Verb {
  id: number;
  root: string;
  root_transliteration: string | null;
  form: number;
  meaning: string;
  past_3ms: string;
  present_3ms: string;
  masdar: string | null;
  active_participle: string | null;
  passive_participle: string | null;
  notes: string | null;
  conjugations: VerbConjugation[];
}

const stateColors: Record<number, string> = {
  0: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  1: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  2: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  3: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

const stateLabels: Record<number, string> = {
  0: "New",
  1: "Learning",
  2: "Mastered",
  3: "Relearning",
};

export default function VerbDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [verb, setVerb] = useState<Verb | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchVerb();
  }, [id]);

  async function fetchVerb() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/verbs/${id}`);
      if (res.ok) {
        const data = await res.json();
        setVerb(data);
      }
    } catch (error) {
      console.error("Error fetching verb:", error);
    }
    setIsLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this verb?")) return;

    try {
      const res = await fetch(`/api/verbs/${id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.href = "/conjugation";
      }
    } catch (error) {
      console.error("Error deleting verb:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="py-12 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!verb) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <Header />
        <div className="py-12 text-center text-slate-500">Verb not found</div>
      </div>
    );
  }

  // Group conjugations by tense
  const pastConjugations = verb.conjugations
    .filter((c) => c.tense === "past")
    .sort((a, b) => {
      const orderA = PersonInfo[a.person]?.order || 99;
      const orderB = PersonInfo[b.person]?.order || 99;
      return orderA - orderB;
    });

  const dueCount = pastConjugations.filter(
    (c) => c.progress && new Date(c.progress.due) <= new Date()
  ).length;

  const newCount = pastConjugations.filter((c) => !c.progress).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header
        actions={
          <>
            <Link
              href={`/conjugation/review?verbId=${id}`}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Practice This Verb {dueCount > 0 ? `(${dueCount} due)` : newCount > 0 ? `(${newCount} new)` : ""}
            </Link>
            <button
              onClick={() => setShowEditModal(true)}
              className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
            >
              Delete
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
          <Link href="/conjugation" className="text-slate-500 hover:text-emerald-600 dark:text-slate-400">
            Conjugation
          </Link>
          <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-700 dark:text-slate-200">{verb.meaning}</span>
        </nav>

        {/* Verb Header */}
        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 dir="rtl" className="text-4xl font-bold text-slate-800 dark:text-white">
                  {verb.past_3ms}
                </h1>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  Form {verb.form}
                </span>
              </div>
              <div className="mb-2 text-xl text-slate-600 dark:text-slate-300">{verb.meaning}</div>
              <div dir="rtl" className="text-lg text-slate-500 dark:text-slate-400">
                Root: {verb.root} | Present: {verb.present_3ms}
              </div>
              {verb.masdar && (
                <div dir="rtl" className="mt-1 text-slate-500 dark:text-slate-400">
                  Masdar: {verb.masdar}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Past Tense Table */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Past Tense (الماضي)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-500 dark:text-slate-400">
                    Person
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
                    Pronoun
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-500 dark:text-slate-400">
                    Conjugation
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pastConjugations.map((conj) => {
                  const personInfo = PersonInfo[conj.person];
                  const state = conj.progress?.state ?? 0;
                  const isDue = conj.progress && new Date(conj.progress.due) <= new Date();

                  return (
                    <tr
                      key={conj.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {personInfo?.english || conj.person}
                      </td>
                      <td dir="rtl" className="px-4 py-3 text-lg text-slate-700 dark:text-slate-200">
                        {conj.pronoun_arabic}
                      </td>
                      <td dir="rtl" className="px-4 py-3 text-xl font-medium text-slate-800 dark:text-white">
                        {conj.conjugated_form}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${stateColors[state]}`}>
                          {isDue && (
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                          )}
                          {stateLabels[state]}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <EditVerbModal
          verb={verb}
          onClose={() => setShowEditModal(false)}
          onSaved={() => {
            setShowEditModal(false);
            fetchVerb();
          }}
        />
      )}
    </div>
  );
}

// Edit Verb Modal
function EditVerbModal({
  verb,
  onClose,
  onSaved,
}: {
  verb: Verb;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    root: verb.root,
    root_transliteration: verb.root_transliteration || "",
    form: verb.form,
    meaning: verb.meaning,
    past_3ms: verb.past_3ms,
    present_3ms: verb.present_3ms,
    masdar: verb.masdar || "",
  });

  const pastConjs = verb.conjugations.filter((c) => c.tense === "past");
  const [conjugations, setConjugations] = useState<Record<string, string>>(
    Object.fromEntries(pastConjs.map((c) => [c.person, c.conjugated_form]))
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/verbs/${verb.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          past_conjugations: conjugations,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update verb");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update verb");
    }
    setIsSubmitting(false);
  }

  const persons = Object.entries(PersonInfo).sort((a, b) => a[1].order - b[1].order);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Edit Verb</h2>
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
                Root
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
                Meaning
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
                Past 3rd m.s.
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
                Present 3rd m.s.
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
                    {info.arabic}
                  </span>
                  <input
                    type="text"
                    dir="rtl"
                    value={conjugations[key] || ""}
                    onChange={(e) => setConjugations({ ...conjugations, [key]: e.target.value })}
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
