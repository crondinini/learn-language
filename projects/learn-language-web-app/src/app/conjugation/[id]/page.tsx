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
  0: "bg-accent-subtle text-accent",
  1: "bg-amber-50 text-amber-600",
  2: "bg-success-subtle text-success",
  3: "bg-error-subtle text-error",
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
      <div className="min-h-screen bg-bg">
        <Header />
        <div className="py-12 text-center text-ink-faint">Loading...</div>
      </div>
    );
  }

  if (!verb) {
    return (
      <div className="min-h-screen bg-bg">
        <Header />
        <div className="py-12 text-center text-ink-faint">Verb not found</div>
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
    <div className="min-h-screen bg-bg">
      <Header />

      <main className="mx-auto max-w-5xl px-7 pt-11 pb-20">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-ink-faint hover:text-accent">
              Home
            </Link>
            <svg className="h-4 w-4 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/conjugation" className="text-ink-faint hover:text-accent">
              Conjugation
            </Link>
            <svg className="h-4 w-4 text-ink-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-ink">{verb.meaning}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/conjugation/review?verbId=${id}`}
              className="rounded-[var(--radius-sm)] bg-accent px-3 py-1.5 text-xs font-medium text-white transition hover:bg-accent-hover hover:-translate-y-px"
            >
              Practice {dueCount > 0 ? `(${dueCount} due)` : newCount > 0 ? `(${newCount} new)` : ""}
            </Link>
            <button
              onClick={() => setShowEditModal(true)}
              className="text-ink-faint hover:text-ink-soft"
              title="Edit verb"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={handleDelete}
              className="text-red-500 hover:text-red-700"
              title="Delete verb"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Verb Header */}
        <div className="mb-8 rounded-[var(--radius-md)] border border-line/50 bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 dir="rtl" className="text-4xl font-bold text-ink">
                  {verb.past_3ms}
                </h1>
                <span className="rounded-full bg-surface-hover px-3 py-1 text-sm text-ink-faint">
                  Form {verb.form}
                </span>
                {verb.is_colloquial === 1 && (
                  <span className="rounded-full bg-surface-hover px-3 py-1 text-sm font-medium text-ink-soft">
                    Colloquial
                  </span>
                )}
              </div>
              <div className="mb-2 text-xl text-ink-soft">{verb.meaning}</div>
              <div dir="rtl" className="text-lg text-ink-faint">
                Root: {verb.root} | Present: {verb.present_3ms}
              </div>
              {verb.masdar && (
                <div dir="rtl" className="mt-1 text-ink-faint">
                  Masdar: {verb.masdar}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conjugation Table */}
        <div className="rounded-[var(--radius-md)] border border-line/50 bg-surface" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="border-b border-line p-4">
            <h2 className="text-lg font-semibold text-ink">
              Conjugations
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-line bg-surface-hover">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-ink-faint">
                    Person
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-ink-faint">
                    Pronoun
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-ink-faint">
                    Present (المضارع)
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-ink-faint">
                    Past (الماضي)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
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
                      className="transition hover:bg-surface-hover"
                    >
                      <td className="px-4 py-3 text-sm text-ink-soft">
                        {personInfo?.english || pastConj.person}
                      </td>
                      <td dir="rtl" className="px-4 py-3 text-lg text-ink">
                        {pastConj.pronoun_arabic}
                      </td>
                      <td dir="rtl" className="px-4 py-3 text-xl font-medium text-ink">
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
                                <span className="h-1 w-1 rounded-full bg-accent"></span>
                              )}
                              {stateLabels[presentState]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-center text-sm text-ink-faint">—</span>
                        )}
                      </td>
                      <td dir="rtl" className="px-4 py-3 text-xl font-medium text-ink">
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
                              <span className="h-1 w-1 rounded-full bg-accent"></span>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="animate-modal max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[var(--radius-md)] bg-surface p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink">Edit Verb</h2>
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
                Root
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
                Meaning
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
                Past 3rd m.s.
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
                Present 3rd m.s.
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
                        {info.arabic}
                      </td>
                      <td className="py-1.5">
                        <input
                          type="text"
                          dir="rtl"
                          value={conjugations[key] || ""}
                          onChange={(e) => setConjugations({ ...conjugations, [key]: e.target.value })}
                          className="w-full rounded-[var(--radius-sm)] border border-line px-3 py-1.5 text-lg"
                        />
                      </td>
                      <td className="py-1.5 pl-2">
                        <input
                          type="text"
                          dir="rtl"
                          value={presentConjugations[key] || ""}
                          onChange={(e) => setPresentConjugations({ ...presentConjugations, [key]: e.target.value })}
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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
