import React, { useState } from "react";
import {
  Sparkles,
  Download,
  FileCode,
  FileSpreadsheet,
  Layers,
  FileText,
  GraduationCap,
  MessageSquare,
  ArrowLeft,
  Calendar,
  Clock,
  HardDrive,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { MeetingRecord } from "../types";
import { AudioPlayerBar } from "./AudioPlayerBar";
import { RequirementsView } from "./RequirementsView";
import { MeetingMinutesView } from "./MeetingMinutesView";
import { StudyModeView } from "./StudyModeView";
import { MeetingChatView } from "./MeetingChatView";
import {
  exportMeetingAsMarkdown,
  exportRequirementsAsCSV,
  exportMeetingAsJSON,
  downloadBlob,
} from "../utils/exportUtils";

interface MeetingDetailsStudioProps {
  meeting: MeetingRecord;
  onBack: () => void;
  onUpdateMeeting: (updated: Partial<MeetingRecord>) => void;
  onTriggerAiAnalysis: (meeting: MeetingRecord) => void;
  isAiAnalyzing: boolean;
  onDeleteMeeting: (id: string) => void;
  initialSeekTimestamp?: number | null;
}

export const MeetingDetailsStudio: React.FC<MeetingDetailsStudioProps> = ({
  meeting,
  onBack,
  onUpdateMeeting,
  onTriggerAiAnalysis,
  isAiAnalyzing,
  onDeleteMeeting,
  initialSeekTimestamp,
}) => {
  const [activeTab, setActiveTab] = useState<"requirements" | "minutes" | "study" | "chat">("requirements");
  const [seekToTimestamp, setSeekToTimestamp] = useState<number | null>(initialSeekTimestamp ?? null);

  React.useEffect(() => {
    if (typeof initialSeekTimestamp === "number") {
      setSeekToTimestamp(initialSeekTimestamp);
      setActiveTab("minutes");
    }
  }, [initialSeekTimestamp]);

  const rfsCount = meeting.analysis?.functionalRequirements?.length || 0;
  const rnfsCount = meeting.analysis?.nonFunctionalRequirements?.length || 0;
  const actionsCount = meeting.analysis?.actionItems?.length || 0;
  const isAiDone = meeting.analysis?.mode === "ai";

  const handleSeekFromChild = (timeInSec: number) => {
    setSeekToTimestamp(timeInSec);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Breadcrumb & Quick Actions */}
      <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#22252D] pb-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] transition cursor-pointer"
              title="Voltar para lista de reuniões"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  {meeting.title}
                </h2>
                {isAiDone ? (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> IA Gemini 3.7
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-[#1C1F26] text-[#8E929E] border border-[#2A2D35]">
                    Processado Offline
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#8E929E] flex items-center gap-1.5 mt-0.5">
                <span>{new Date(meeting.createdAt).toLocaleString("pt-BR")}</span>
                <span>•</span>
                <span>{meeting.durationFormatted}</span>
                <span>•</span>
                <span className="font-mono text-blue-400 font-bold">{rfsCount} Requisitos Funcionais</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => onTriggerAiAnalysis(meeting)}
              disabled={isAiAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition disabled:opacity-50 cursor-pointer"
            >
              {isAiAnalyzing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              )}
              <span>{isAiDone ? "Reprocessar Gemini" : "Analisar com Gemini IA"}</span>
            </button>

            <button
              onClick={() => exportMeetingAsMarkdown(meeting)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] transition"
              title="Exportar documento completo em Markdown"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Markdown</span>
            </button>

            <button
              onClick={() => exportRequirementsAsCSV(meeting)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] transition"
              title="Exportar Requisitos para CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => exportMeetingAsJSON(meeting)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] transition"
              title="Backup JSON"
            >
              <HardDrive className="w-3.5 h-3.5 text-[#8E929E]" />
              <span>JSON</span>
            </button>

            <button
              onClick={() => {
                if (confirm(`Tem certeza que deseja excluir "${meeting.title}"?`)) {
                  onDeleteMeeting(meeting.id);
                }
              }}
              className="p-1.5 rounded-lg bg-[#1C1F26] hover:bg-red-500/15 text-[#8E929E] hover:text-red-400 border border-[#2A2D35] transition"
              title="Excluir gravação"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Audio Player Bar */}
        <AudioPlayerBar
          meeting={meeting}
          seekToTimestamp={seekToTimestamp}
          onClearSeek={() => setSeekToTimestamp(null)}
        />
      </div>

      {isAiAnalyzing && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-center gap-2.5 animate-pulse">
          <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
          <div>
            <p className="font-bold text-xs">Executando Inteligência Artificial Gemini 3.7...</p>
            <p className="text-[#8E929E] text-[11px] mt-0.5">
              Transcrevendo áudio, gerando resumo conciso dos pontos discutidos, refinando requisitos (RF/RNF) e timecodes.
            </p>
          </div>
        </div>
      )}

      {/* Main Feature Tabs */}
      <div className="flex items-center gap-1 bg-[#14161B] p-1 rounded-lg border border-[#22252D] w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab("requirements")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "requirements"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Engenharia de Requisitos ({rfsCount + rnfsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("minutes")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "minutes"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Resumo & Ata Sincronizada ({actionsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab("study")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "study"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
          <span>Modo de Estudo & Flashcards</span>
        </button>

        <button
          onClick={() => setActiveTab("chat")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === "chat"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          <span>Chat com a Reunião</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === "requirements" && (
        <RequirementsView meeting={meeting} onUpdateMeeting={onUpdateMeeting} />
      )}

      {activeTab === "minutes" && (
        <MeetingMinutesView
          meeting={meeting}
          onUpdateMeeting={onUpdateMeeting}
          onSeekToTimestamp={handleSeekFromChild}
        />
      )}

      {activeTab === "study" && <StudyModeView meeting={meeting} />}

      {activeTab === "chat" && (
        <MeetingChatView meeting={meeting} onUpdateMeeting={onUpdateMeeting} />
      )}
    </div>
  );
};
