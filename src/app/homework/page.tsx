"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";

interface Homework {
  id: number;
  description: string;
  type: "recording";
  status: "pending" | "completed";
  recording_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function HomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  // Recording state
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    fetchHomework();
  }, [filter]);

  async function fetchHomework() {
    const url = filter === "all" ? "/api/homework" : `/api/homework?status=${filter}`;
    const res = await fetch(url);
    const data = await res.json();
    setHomework(data);
    setIsLoading(false);
  }

  async function createHomework(e: React.FormEvent) {
    e.preventDefault();
    if (!newDescription.trim()) return;

    await fetch("/api/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: newDescription, type: "recording" }),
    });

    setNewDescription("");
    setShowModal(false);
    fetchHomework();
  }

  async function deleteHomework(id: number) {
    if (!confirm("Delete this homework?")) return;
    await fetch(`/api/homework/${id}`, { method: "DELETE" });
    fetchHomework();
  }

  // Start recording
  async function startRecording(id: number) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setRecordingId(id);
      setIsRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Could not access microphone. Please allow microphone access.");
    }
  }

  // Stop recording
  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }

  // Cancel recording
  function cancelRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setRecordingId(null);
    setIsRecording(false);
    setAudioBlob(null);
    setAudioUrl(null);
  }

  // Submit recording
  async function submitRecording() {
    if (!audioBlob || !recordingId) return;

    const formData = new FormData();
    formData.append("audio", audioBlob, `recording-${recordingId}.webm`);

    try {
      const res = await fetch(`/api/homework/${recordingId}/recording`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setRecordingId(null);
        setAudioBlob(null);
        setAudioUrl(null);
        fetchHomework();
      } else {
        alert("Failed to upload recording");
      }
    } catch (error) {
      console.error("Error uploading recording:", error);
      alert("Failed to upload recording");
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header
        actions={
          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
          >
            + New Homework
          </button>
        }
      />

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Filter tabs */}
        <div className="mb-6 flex gap-2">
          {(["all", "pending", "completed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                filter === f
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center text-slate-500">Loading...</div>
        ) : homework.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-600">
            <p className="text-lg text-slate-500 dark:text-slate-400">No homework yet</p>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
              Create your first homework assignment
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
            >
              Create Homework
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {homework.map((hw) => (
              <div
                key={hw.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          hw.status === "completed"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {hw.status}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(hw.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-800 dark:text-white">{hw.description}</p>

                    {/* Recording UI */}
                    {hw.status === "pending" && (
                      <div className="mt-4">
                        {recordingId === hw.id ? (
                          <div className="flex items-center gap-3">
                            {isRecording ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <span className="h-3 w-3 animate-pulse rounded-full bg-red-500"></span>
                                  <span className="text-sm text-red-600">Recording...</span>
                                </div>
                                <button
                                  onClick={stopRecording}
                                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                >
                                  Stop
                                </button>
                              </>
                            ) : audioUrl ? (
                              <>
                                <audio src={audioUrl} controls className="h-10" />
                                <button
                                  onClick={submitRecording}
                                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
                                >
                                  Submit
                                </button>
                                <button
                                  onClick={cancelRecording}
                                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : (
                          <button
                            onClick={() => startRecording(hw.id)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                            </svg>
                            Record
                          </button>
                        )}
                      </div>
                    )}

                    {/* Playback for completed */}
                    {hw.status === "completed" && hw.recording_url && (
                      <div className="mt-4">
                        <audio src={hw.recording_url} controls className="h-10" />
                        {hw.completed_at && (
                          <p className="mt-1 text-xs text-slate-400">
                            Completed {formatDate(hw.completed_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteHomework(hw.id)}
                    className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
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

      {/* Create Homework Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white">New Homework</h2>
            <form onSubmit={createHomework} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Read chapter 3 and record yourself reading the dialogue..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Type
                </label>
                <select
                  disabled
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-600 dark:bg-slate-700"
                >
                  <option>Recording</option>
                </select>
                <p className="mt-1 text-xs text-slate-400">More types coming soon</p>
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
