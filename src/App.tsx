/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { LiveRecorderPanel } from "./components/LiveRecorderPanel";
import { FileManager } from "./components/FileManager";
import { MeetingDetailsStudio } from "./components/MeetingDetailsStudio";
import { WindowsGuideModal } from "./components/WindowsGuideModal";
import { AudioKeywordSearchModal } from "./components/AudioKeywordSearchModal";
import { AudioCaptureEngine } from "./utils/audioRecorder";
import { MeetingRecord } from "./types";
import { getAllMeetingsFromDB, saveMeetingToDB, deleteMeetingFromDB, updateMeetingInDB } from "./utils/db";
import { getInitialSampleMeeting } from "./utils/sampleData";
import confetti from "canvas-confetti";

export default function App() {
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"recorder" | "library" | "details">("recorder");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<string>("00:00");
  const [isWindowsGuideOpen, setIsWindowsGuideOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [activeSeekTimestamp, setActiveSeekTimestamp] = useState<number | null>(null);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const audioEngineRef = useRef<AudioCaptureEngine | null>(null);

  // Global keyboard shortcut for search (Ctrl+K or Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K" || e.key === "f" || e.key === "F")) {
        // Prevent default browser search if in app context
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load meetings from IndexedDB on startup
  useEffect(() => {
    async function initDB() {
      try {
        let storedMeetings = await getAllMeetingsFromDB();
        if (storedMeetings.length === 0) {
          const sample = getInitialSampleMeeting();
          await saveMeetingToDB(sample);
          storedMeetings = [sample];
        }
        setMeetings(storedMeetings);
        if (storedMeetings.length > 0) {
          setSelectedMeetingId(storedMeetings[0].id);
        }
      } catch (err) {
        console.error("Erro ao inicializar base IndexedDB:", err);
      }
    }
    initDB();
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleMeetingSaved = (newMeeting: MeetingRecord) => {
    setMeetings((prev) => [newMeeting, ...prev]);
    setSelectedMeetingId(newMeeting.id);
    setActiveTab("details");
    showToast(`Gravação "${newMeeting.title}" salva em MP3 com sucesso!`, "success");
  };

  const handleUpdateMeeting = async (partial: Partial<MeetingRecord>) => {
    if (!selectedMeetingId) return;
    try {
      const updated = await updateMeetingInDB(selectedMeetingId, partial);
      if (updated) {
        setMeetings((prev) => prev.map((m) => (m.id === selectedMeetingId ? updated : m)));
      }
    } catch (err) {
      console.error("Erro ao atualizar reunião:", err);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    try {
      await deleteMeetingFromDB(id);
      const remaining = meetings.filter((m) => m.id !== id);
      setMeetings(remaining);
      if (selectedMeetingId === id) {
        if (remaining.length > 0) {
          setSelectedMeetingId(remaining[0].id);
        } else {
          setSelectedMeetingId(null);
          setActiveTab("recorder");
        }
      }
      showToast("Gravação excluída.", "info");
    } catch (err) {
      console.error("Erro ao excluir reunião:", err);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const meeting = meetings.find((m) => m.id === id);
    if (!meeting) return;
    const newFav = !meeting.favorite;
    await updateMeetingInDB(id, { favorite: newFav });
    setMeetings((prev) => prev.map((m) => (m.id === id ? { ...m, favorite: newFav } : m)));
  };

  const handleTriggerAiAnalysis = async (targetMeeting: MeetingRecord) => {
    setIsAiAnalyzing(true);
    showToast("Enviando áudio e transcrição para IA Gemini 3.7...", "info");

    try {
      let audioBase64: string | undefined = undefined;
      let mimeType = "audio/mp3";

      if (targetMeeting.audioBlob) {
        try {
          const buffer = await targetMeeting.audioBlob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = "";
          const len = bytes.byteLength;
          // Chunked base64 conversion to avoid stack overflow on big files
          const chunkSize = 0x8000;
          for (let i = 0; i < len; i += chunkSize) {
            binary += String.fromCharCode.apply(
              null,
              bytes.subarray(i, Math.min(i + chunkSize, len)) as any
            );
          }
          audioBase64 = btoa(binary);
          mimeType = targetMeeting.audioBlob.type || "audio/mp3";
        } catch (e) {
          console.warn("Could not encode audioBlob as base64, proceeding with transcript:", e);
        }
      }

      const response = await fetch("/api/analyze-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingTitle: targetMeeting.title,
          transcript: targetMeeting.transcript,
          audioBase64,
          mimeType,
          duration: targetMeeting.durationFormatted,
          offlineNotes: targetMeeting.offlineNotes,
          tags: targetMeeting.tags,
        }),
      });

      const resJson = await response.json();
      if (!resJson.success) {
        throw new Error(resJson.error || "Erro ao processar reunião com Gemini.");
      }

      const aiData = resJson.data;
      const updatedAnalysis = {
        ...aiData,
        mode: "ai",
        generatedAt: new Date().toISOString(),
      };

      const updatedMeeting: MeetingRecord = {
        ...targetMeeting,
        transcript: aiData.transcription || targetMeeting.transcript,
        analysis: updatedAnalysis,
      };

      await updateMeetingInDB(targetMeeting.id, updatedMeeting);
      setMeetings((prev) => prev.map((m) => (m.id === targetMeeting.id ? updatedMeeting : m)));

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      showToast("Análise e Levantamento de Requisitos gerados com sucesso pela IA!", "success");
    } catch (err: any) {
      console.error("Erro na análise IA:", err);
      showToast(`Falha na análise IA: ${err.message || "Erro desconhecido"}`, "error");
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const currentMeeting = meetings.find((m) => m.id === selectedMeetingId) || meetings[0];

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-[#E0E0E0] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-3.5 py-2.5 rounded-lg shadow-2xl text-xs font-semibold flex items-center gap-2 border transition-all animate-bounce ${
            notification.type === "success"
              ? "bg-[#14161B] text-emerald-400 border-emerald-500/40 shadow-black/80"
              : notification.type === "error"
              ? "bg-[#14161B] text-red-400 border-red-500/40 shadow-black/80"
              : "bg-[#14161B] text-blue-400 border-blue-500/40 shadow-black/80"
          }`}
        >
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main App Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRecording={isRecording}
        recordingTime={recordingTime}
        hasSelectedMeeting={!!currentMeeting}
        onOpenWindowsGuide={() => setIsWindowsGuideOpen(true)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
      />

      {/* Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5">
        {activeTab === "recorder" && (
          <LiveRecorderPanel
            onMeetingSaved={handleMeetingSaved}
            onOpenWindowsGuide={() => setIsWindowsGuideOpen(true)}
            audioEngineRef={audioEngineRef}
            isRecording={isRecording}
            setIsRecording={setIsRecording}
            recordingTime={recordingTime}
            setRecordingTime={setRecordingTime}
          />
        )}

        {activeTab === "library" && (
          <FileManager
            meetings={meetings}
            selectedMeetingId={selectedMeetingId}
            onSelectMeeting={(id) => {
              setSelectedMeetingId(id);
              setActiveSeekTimestamp(null);
              setActiveTab("details");
            }}
            onDeleteMeeting={handleDeleteMeeting}
            onToggleFavorite={handleToggleFavorite}
            onImportMeeting={(m) => {
              setMeetings((prev) => [m, ...prev]);
              setSelectedMeetingId(m.id);
              setActiveSeekTimestamp(null);
              setActiveTab("details");
              showToast(`Áudio "${m.title}" importado com sucesso!`, "success");
            }}
            onTriggerAiAnalysis={handleTriggerAiAnalysis}
            isAiAnalyzing={isAiAnalyzing}
          />
        )}

        {activeTab === "details" && currentMeeting && (
          <MeetingDetailsStudio
            meeting={currentMeeting}
            onBack={() => {
              setActiveSeekTimestamp(null);
              setActiveTab("library");
            }}
            onUpdateMeeting={handleUpdateMeeting}
            onTriggerAiAnalysis={handleTriggerAiAnalysis}
            isAiAnalyzing={isAiAnalyzing}
            onDeleteMeeting={handleDeleteMeeting}
            initialSeekTimestamp={activeSeekTimestamp}
          />
        )}
      </main>

      {/* Keyword & Timecode Search Modal */}
      <AudioKeywordSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        meetings={meetings}
        onSelectResult={(meetingId, timestamp) => {
          setSelectedMeetingId(meetingId);
          setActiveSeekTimestamp(timestamp);
          setActiveTab("details");
          showToast(`Saltando para ${Math.floor(timestamp / 60)}:${Math.floor(timestamp % 60).toString().padStart(2, "0")} no áudio...`, "info");
        }}
      />

      {/* Windows 10/11 Audio Setup & Shortcuts Modal */}
      <WindowsGuideModal
        isOpen={isWindowsGuideOpen}
        onClose={() => setIsWindowsGuideOpen(false)}
      />

      {/* High Density Windows Status Footer */}
      <footer className="border-t border-[#22252D] bg-[#0E1015] py-2 text-center text-xs text-[#6B7280]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Windows Audio Pipeline • Suporte Offline & IndexedDB Local Ativo</span>
          </span>
          <span className="text-[11px] text-[#8E929E]">
            Atalhos: <kbd className="px-1.5 py-0.5 rounded bg-[#14161B] border border-[#22252D] text-[#C4C7D0] font-mono text-[10px]">Alt + R</kbd> Gravar • <kbd className="px-1.5 py-0.5 rounded bg-[#14161B] border border-[#22252D] text-[#C4C7D0] font-mono text-[10px]">Alt + M</kbd> Marcar Requisito
          </span>
        </div>
      </footer>
    </div>
  );
}
