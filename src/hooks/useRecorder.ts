"use client";

import { useState, useRef, useCallback } from "react";

interface UseRecorderOptions {
  onRecordingComplete?: (blob: Blob) => void;
  autoUpload?: boolean;
  uploadUrl?: string;
}

interface UseRecorderReturn {
  isRecording: boolean;
  isUploading: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  cancelRecording: () => void;
  uploadRecording: (url: string) => Promise<boolean>;
  clearRecording: () => void;
}

export function useRecorder(options: UseRecorderOptions = {}): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        // Call callback if provided
        if (options.onRecordingComplete) {
          options.onRecordingComplete(blob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (error) {
      console.error("Error starting recording:", error);
      throw new Error("Could not access microphone. Please check permissions.");
    }
  }, [options]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    setIsRecording(false);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
  }, [isRecording, audioUrl]);

  const clearRecording = useCallback(() => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
  }, [audioUrl]);

  const uploadRecording = useCallback(
    async (url: string): Promise<boolean> => {
      if (!audioBlob) return false;

      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");

        const res = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          clearRecording();
          return true;
        }
        return false;
      } catch (error) {
        console.error("Error uploading recording:", error);
        return false;
      } finally {
        setIsUploading(false);
      }
    },
    [audioBlob, clearRecording]
  );

  return {
    isRecording,
    isUploading,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    cancelRecording,
    uploadRecording,
    clearRecording,
  };
}
