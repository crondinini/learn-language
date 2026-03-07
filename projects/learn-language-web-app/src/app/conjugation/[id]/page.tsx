"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import SpeakerButton from "@/components/SpeakerButton";
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
  is_colloquial: number;
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

  const presentConjugations = verb.conjugations
    .filter((c) => c.tense === "present")
    .sort((a, b) => {
      const orderA = PersonInfo[a.person]?.order || 99;
      const orderB = PersonInfo[b.person]?.order || 99;
      return orderA - orderB;
    });

  // Create a map of present conjugations by person for easy lookup
  const presentByPerson = new Map(presentConjugations.map((c) => [c.person, c]));

  const allConjugations = [...pastConjugations, ...presentConjugations];

  const dueCount = allConjugations.filter(
    (c) => c.progress && new Date(c.progress.due) <= new Date()
  ).length;

  const newCount = allConjugations.filter((c) => !c.progress).length;

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
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
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
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              title="Edit verb"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              title="Delete verb"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
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
                {verb.is_colloquial === 1 && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Colloquial
                  </span>
                )}
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

        {/* Conjugation Table */}
        <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Conjugations
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
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    Present (المضارع)
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    Past (الماضي)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {pastConjugations.map((pastConj) => {
                  const personInfo = PersonInfo[pastConj.person];
                  const presentConj = presentByPerson.get(pastConj.person);

                  const pastState = pastConj.progress?.state ?? 0;
                  const pastIsDue = pastConj.progress && new Date(pastConj.progress.due) <= new Date();
                  const presentState = presentConj?.progress?.state ?? 0;
                  const presentIsDue = presentConj?.progress && new Date(presentConj.progress.due) <= new Date();

                  return (
                    <tr
                      key={pastConj.id}
                      className="transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {personInfo?.english || pastConj.person}
                      </td>
                      <td dir="rtl" className="px-4 py-3 text-lg text-slate-700 dark:text-slate-200">
                        {pastConj.pronoun_arabic}
                      </td>
                      <td dir="rtl" className="px-4 py-3 text-xl font-medium text-slate-800 dark:text-white">
                        {presentConj ? (
                          <div className="flex items-center justify-center gap-2">
                            {presentConj.conjugated_form}
                            <SpeakerButton
                              text={presentConj.conjugated_form}
                              audioUrl={presentConj.audio_url}
                              entityType="conjugation"
                              entityId={presentConj.id}
                              size="sm"
                            />
                            <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${stateColors[presentState]}`}>
                              {presentIsDue && (
                                <span className="h-1 w-1 rounded-full bg-blue-500"></span>
                              )}
                              {stateLabels[presentState]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-center text-sm text-slate-400">—</span>
                        )}
                      </td>
                      <td dir="rtl" className="px-4 py-3 text-xl font-medium text-slate-800 dark:text-white">
                        <div className="flex items-center justify-center gap-2">
                          {pastConj.conjugated_form}
                          <SpeakerButton
                            text={pastConj.conjugated_form}
                            audioUrl={pastConj.audio_url}
                            entityType="conjugation"
                            entityId={pastConj.id}
                            size="sm"
                          />
                          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${stateColors[pastState]}`}>
                            {pastIsDue && (
                              <span className="h-1 w-1 rounded-full bg-blue-500"></span>
                            )}
                            {stateLabels[pastState]}
                          </span>
                        </div>
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
    is_colloquial: verb.is_colloquial === 1,
  });

  const pastConjs = verb.conjugations.filter((c) => c.tense === "past");
  const presentConjs = verb.conjugations.filter((c) => c.tense === "present");
  const [conjugations, setConjugations] = useState<Record<string, string>>(
    Object.fromEntries(pastConjs.map((c) => [c.person, c.conjugated_form]))
  );
  const [presentConjugations, setPresentConjugations] = useState<Record<string, string>>(
    Object.fromEntries(presentConjs.map((c) => [c.person, c.conjugated_form]))
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
          present_conjugations: presentConjugations,
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
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.is_colloquial}
                  onChange={(e) => setForm({ ...form, is_colloquial: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                Colloquial / Levantine (not MSA)
              </label>
            </div>
          </div>

          {/* Conjugations */}
          <div className="mb-6">
            <h3 className="mb-3 text-lg font-semibold text-slate-800 dark:text-white">
              Conjugations
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-2 text-left font-medium text-slate-500 dark:text-slate-400">Pronoun</th>
                    <th className="pb-2 text-right font-medium text-slate-500 dark:text-slate-400">Past</th>
                    <th className="pb-2 text-right font-medium text-slate-500 dark:text-slate-400">Present</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map(([key, info]) => (
                    <tr key={key}>
                      <td className="py-1.5 text-slate-500 dark:text-slate-400">
                        {info.arabic}
                      </td>
                      <td className="py-1.5">
                        <input
                          type="text"
                          dir="rtl"
                          value={conjugations[key] || ""}
                          onChange={(e) => setConjugations({ ...conjugations, [key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-lg dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        />
                      </td>
                      <td className="py-1.5 pl-2">
                        <input
                          type="text"
                          dir="rtl"
                          value={presentConjugations[key] || ""}
                          onChange={(e) => setPresentConjugations({ ...presentConjugations, [key]: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-lg dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
