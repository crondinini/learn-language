"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";

interface Homework {
  id: number;
  description: string;
  type: "recording" | "written" | "listening";
  status: "pending" | "completed";
  recording_url: string | null;
  transcription: string | null;
  written_text: string | null;
  image_url: string | null;
  audio_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export default function HomeworkPage() {
  const [homework, setHomework] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState<"recording" | "written" | "listening">("recording");
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");

  // Listening homework creation state
  const [listeningAudio, setListeningAudio] = useState<File | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Listening exercise state (for viewing/answering)
  const [showTranscription, setShowTranscription] = useState<{[id: number]: boolean}>({});
  const [listeningResponse, setListeningResponse] = useState<{[id: number]: string}>({});
  const [listeningId, setListeningId] = useState<number | null>(null);

  // Recording state
  const [recordingId, setRecordingId] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Written homework state
  const [writtenId, setWrittenId] = useState<number | null>(null);
  const [writtenText, setWrittenText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Transcription state
  const [transcribingId, setTranscribingId] = useState<number | null>(null);

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

    // For listening type, require audio file
    if (newType === "listening" && !listeningAudio) {
      alert("Please upload an audio file for listening homework");
      return;
    }

    try {
      // Create the homework
      const res = await fetch("/api/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newDescription,
          type: newType,
        }),
      });

      const newHomework = await res.json();

      // If listening type, upload the audio file
      if (newType === "listening" && listeningAudio) {
        const formData = new FormData();
        formData.append("audio", listeningAudio);

        await fetch(`/api/homework/${newHomework.id}/audio`, {
          method: "POST",
          body: formData,
        });
      }

      setNewDescription("");
      setNewType("recording");
      setListeningAudio(null);
      if (audioInputRef.current) {
        audioInputRef.current.value = "";
      }
      setShowModal(false);
      fetchHomework();
    } catch (error) {
      console.error("Error creating homework:", error);
      alert("Failed to create homework");
    }
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

  // Start written homework (or edit existing)
  function startWritten(id: number, existingText?: string | null) {
    setWrittenId(id);
    setWrittenText(existingText || "");
    setSelectedImage(null);
    setImagePreview(null);
  }

  // Cancel written homework
  function cancelWritten() {
    setWrittenId(null);
    setWrittenText("");
    setSelectedImage(null);
    setImagePreview(null);
  }

  // Handle image selection
  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  }

  // Remove selected image
  function removeImage() {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Submit written homework
  async function submitWritten() {
    if (!writtenId || (!writtenText.trim() && !selectedImage)) {
      alert("Please enter text or upload an image");
      return;
    }

    setIsSubmitting(true);

    try {
      // If there's an image, upload it first
      if (selectedImage) {
        const formData = new FormData();
        formData.append("image", selectedImage);

        const imageRes = await fetch(`/api/homework/${writtenId}/image`, {
          method: "POST",
          body: formData,
        });

        if (!imageRes.ok) {
          throw new Error("Failed to upload image");
        }
      }

      // If there's text, update it (and mark complete if no image)
      if (writtenText.trim()) {
        const updateBody: { written_text: string; status?: string } = {
          written_text: writtenText.trim(),
        };
        // Only set status to completed if no image was uploaded (image upload already sets it)
        if (!selectedImage) {
          updateBody.status = "completed";
        }

        const textRes = await fetch(`/api/homework/${writtenId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updateBody),
        });

        if (!textRes.ok) {
          throw new Error("Failed to save text");
        }
      }

      setWrittenId(null);
      setWrittenText("");
      setSelectedImage(null);
      setImagePreview(null);
      fetchHomework();
    } catch (error) {
      console.error("Error submitting written homework:", error);
      alert("Failed to submit homework");
    } finally {
      setIsSubmitting(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Transcribe a recording
  async function transcribeRecording(id: number) {
    setTranscribingId(id);
    try {
      const res = await fetch(`/api/homework/${id}/transcribe`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        fetchHomework();
      } else {
        alert(data.error || "Failed to transcribe");
      }
    } catch (error) {
      console.error("Error transcribing:", error);
      alert("Failed to transcribe recording");
    } finally {
      setTranscribingId(null);
    }
  }

  // Start listening exercise
  function startListening(id: number) {
    setListeningId(id);
    setListeningResponse((prev) => ({ ...prev, [id]: prev[id] || "" }));
  }

  // Cancel listening exercise
  function cancelListening() {
    setListeningId(null);
  }

  // Toggle transcription visibility
  function toggleTranscription(id: number) {
    setShowTranscription((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Submit listening response
  async function submitListening(id: number) {
    const response = listeningResponse[id];
    if (!response?.trim()) {
      alert("Please write your response");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/homework/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          written_text: response.trim(),
          status: "completed",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit response");
      }

      setListeningId(null);
      fetchHomework();
    } catch (error) {
      console.error("Error submitting listening response:", error);
      alert("Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
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
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          hw.type === "recording"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : hw.type === "listening"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        }`}
                      >
                        {hw.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(hw.created_at)}
                      </span>
                    </div>
                    <p className="mt-2 text-slate-800 dark:text-white">{hw.description}</p>

                    {/* Recording UI - for recording type */}
                    {hw.type === "recording" && hw.status === "pending" && (
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

                    {/* Written UI - for written type */}
                    {hw.type === "written" && hw.status === "pending" && (
                      <div className="mt-4">
                        {writtenId === hw.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={writtenText}
                              onChange={(e) => setWrittenText(e.target.value)}
                              placeholder="Type your answer here..."
                              rows={4}
                              dir="auto"
                              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-xl leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                            />
                            <div className="flex items-center gap-3">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                                id={`image-upload-${hw.id}`}
                              />
                              <label
                                htmlFor={`image-upload-${hw.id}`}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Upload Image
                              </label>
                              <span className="text-xs text-slate-400">or type text above</span>
                            </div>
                            {imagePreview && (
                              <div className="relative inline-block">
                                <img
                                  src={imagePreview}
                                  alt="Preview"
                                  className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-600"
                                />
                                <button
                                  type="button"
                                  onClick={removeImage}
                                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={submitWritten}
                                disabled={isSubmitting || (!writtenText.trim() && !selectedImage)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {isSubmitting ? "Submitting..." : "Submit"}
                              </button>
                              <button
                                onClick={cancelWritten}
                                disabled={isSubmitting}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startWritten(hw.id)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Write Answer
                          </button>
                        )}
                      </div>
                    )}

                    {/* Listening UI - for listening type pending */}
                    {hw.type === "listening" && hw.status === "pending" && hw.audio_url && (
                      <div className="mt-4 space-y-4">
                        {/* Audio player */}
                        <audio src={hw.audio_url} controls className="h-10 w-full max-w-md" />

                        {/* Transcription section */}
                        {hw.transcription ? (
                          <div>
                            <button
                              onClick={() => toggleTranscription(hw.id)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {showTranscription[hw.id] ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                )}
                              </svg>
                              {showTranscription[hw.id] ? "Hide Transcription" : "Show Transcription"}
                            </button>
                            {showTranscription[hw.id] && (
                              <div className="mt-3 rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p
                                  dir="rtl"
                                  className="text-xl leading-relaxed text-slate-700 dark:text-slate-300"
                                  style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                                >
                                  {hw.transcription}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => transcribeRecording(hw.id)}
                            disabled={transcribingId === hw.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            {transcribingId === hw.id ? (
                              <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Transcribing...
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Transcribe Audio
                              </>
                            )}
                          </button>
                        )}

                        {/* Response section */}
                        {listeningId === hw.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={listeningResponse[hw.id] || ""}
                              onChange={(e) => setListeningResponse((prev) => ({ ...prev, [hw.id]: e.target.value }))}
                              placeholder="Write your response..."
                              rows={4}
                              dir="auto"
                              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-xl leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => submitListening(hw.id)}
                                disabled={isSubmitting}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {isSubmitting ? "Submitting..." : "Submit"}
                              </button>
                              <button
                                onClick={cancelListening}
                                disabled={isSubmitting}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startListening(hw.id)}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Write Response
                          </button>
                        )}
                      </div>
                    )}

                    {/* Playback for completed recording */}
                    {hw.type === "recording" && hw.status === "completed" && hw.recording_url && (
                      <div className="mt-4 space-y-3">
                        <audio src={hw.recording_url} controls className="h-10" />

                        {/* Transcription section */}
                        {hw.transcription ? (
                          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                            <div className="mb-2 flex items-center justify-between">
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Transcription
                              </span>
                              <button
                                onClick={() => transcribeRecording(hw.id)}
                                disabled={transcribingId === hw.id}
                                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50 dark:text-blue-400"
                              >
                                {transcribingId === hw.id ? "Transcribing..." : "Re-transcribe"}
                              </button>
                            </div>
                            <p
                              dir="rtl"
                              className="text-xl leading-relaxed text-slate-700 dark:text-slate-300"
                              style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                            >
                              {hw.transcription}
                            </p>
                          </div>
                        ) : (
                          <button
                            onClick={() => transcribeRecording(hw.id)}
                            disabled={transcribingId === hw.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                          >
                            {transcribingId === hw.id ? (
                              <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Transcribing...
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Transcribe Recording
                              </>
                            )}
                          </button>
                        )}

                        {hw.completed_at && (
                          <p className="text-xs text-slate-400">
                            Completed {formatDate(hw.completed_at)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Display for completed written homework */}
                    {hw.type === "written" && hw.status === "completed" && (
                      <div className="mt-4 space-y-3">
                        {writtenId === hw.id ? (
                          /* Edit mode */
                          <div className="space-y-3">
                            <textarea
                              value={writtenText}
                              onChange={(e) => setWrittenText(e.target.value)}
                              placeholder="Type your answer here..."
                              rows={4}
                              dir="auto"
                              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-xl leading-relaxed focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                              style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                            />
                            <div className="flex items-center gap-3">
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                                id={`image-edit-${hw.id}`}
                              />
                              <label
                                htmlFor={`image-edit-${hw.id}`}
                                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {hw.image_url ? "Replace Image" : "Upload Image"}
                              </label>
                            </div>
                            {imagePreview && (
                              <div className="relative inline-block">
                                <img
                                  src={imagePreview}
                                  alt="Preview"
                                  className="max-h-48 rounded-lg border border-slate-200 dark:border-slate-600"
                                />
                                <button
                                  type="button"
                                  onClick={removeImage}
                                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
                                >
                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            )}
                            {!imagePreview && hw.image_url && (
                              <div className="text-xs text-slate-400">
                                Current image will be kept unless you upload a new one
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={submitWritten}
                                disabled={isSubmitting || (!writtenText.trim() && !selectedImage && !hw.image_url)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                {isSubmitting ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={cancelWritten}
                                disabled={isSubmitting}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Display mode */
                          <>
                            {hw.written_text && (
                              <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                                <p
                                  dir="auto"
                                  className="whitespace-pre-wrap text-xl leading-relaxed text-slate-700 dark:text-slate-300"
                                  style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                                >
                                  {hw.written_text}
                                </p>
                              </div>
                            )}
                            {hw.image_url && (
                              <img
                                src={hw.image_url}
                                alt="Homework submission"
                                className="max-h-64 rounded-lg border border-slate-200 dark:border-slate-600"
                              />
                            )}
                            <div className="flex items-center gap-3">
                              {hw.completed_at && (
                                <p className="text-xs text-slate-400">
                                  Completed {formatDate(hw.completed_at)}
                                </p>
                              )}
                              <button
                                onClick={() => startWritten(hw.id, hw.written_text)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
                              >
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Display for completed listening homework */}
                    {hw.type === "listening" && hw.status === "completed" && (
                      <div className="mt-4 space-y-3">
                        {/* Audio player */}
                        {hw.audio_url && (
                          <audio src={hw.audio_url} controls className="h-10 w-full max-w-md" />
                        )}

                        {/* Transcription (always visible when completed) */}
                        {hw.transcription && (
                          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-700/50">
                            <span className="mb-2 block text-xs font-medium text-slate-500 dark:text-slate-400">
                              Transcription
                            </span>
                            <p
                              dir="rtl"
                              className="text-xl leading-relaxed text-slate-700 dark:text-slate-300"
                              style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                            >
                              {hw.transcription}
                            </p>
                          </div>
                        )}

                        {/* User's response */}
                        {hw.written_text && (
                          <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                            <span className="mb-2 block text-xs font-medium text-blue-600 dark:text-blue-400">
                              Your Response
                            </span>
                            <p
                              dir="auto"
                              className="whitespace-pre-wrap text-xl leading-relaxed text-slate-700 dark:text-slate-300"
                              style={{ fontFamily: "var(--font-arabic), sans-serif" }}
                            >
                              {hw.written_text}
                            </p>
                          </div>
                        )}

                        {hw.completed_at && (
                          <p className="text-xs text-slate-400">
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
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as "recording" | "written" | "listening")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                >
                  <option value="recording">Recording</option>
                  <option value="written">Written</option>
                  <option value="listening">Listening</option>
                </select>
              </div>

              {/* Listening-specific fields */}
              {newType === "listening" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Audio File
                  </label>
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setListeningAudio(e.target.files?.[0] || null)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-4 file:rounded file:border-0 file:bg-emerald-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white dark:file:bg-emerald-900/30 dark:file:text-emerald-400"
                  />
                  {listeningAudio && (
                    <p className="mt-1 text-xs text-slate-500">{listeningAudio.name}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    The audio will be automatically transcribed after upload
                  </p>
                </div>
              )}

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
