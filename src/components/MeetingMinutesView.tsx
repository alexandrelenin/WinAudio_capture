import React, { useState, useMemo } from "react";
import {
  FileText,
  CheckSquare,
  Square,
  Users,
  Calendar,
  Sparkles,
  Copy,
  Check,
  Download,
  Clock,
  Send,
  Plus,
  Search,
  Play,
  ListOrdered,
  X,
} from "lucide-react";
import { MeetingRecord, ActionItem, TranscriptSegment } from "../types";
import { exportMeetingAsMarkdown } from "../utils/exportUtils";
import { parseTimeToSeconds } from "../utils/searchUtils";

interface MeetingMinutesViewProps {
  meeting: MeetingRecord;
  onUpdateMeeting: (updated: Partial<MeetingRecord>) => void;
  onSeekToTimestamp?: (timestamp: number) => void;
}

export const MeetingMinutesView: React.FC<MeetingMinutesViewProps> = ({
  meeting,
  onUpdateMeeting,
  onSeekToTimestamp,
}) => {
  const [copiedTranscript, setCopiedTranscript] = useState<boolean>(false);
  const [newActionTask, setNewActionTask] = useState<string>("");
  const [newActionAssignee, setNewActionAssignee] = useState<string>("");
  const [transcriptSearch, setTranscriptSearch] = useState<string>("");

  const a = meeting.analysis;
  const actionItems: ActionItem[] = a?.actionItems || [];
  const keyPoints = a?.keyPoints || a?.keyDiscussionPoints || [];
  const conciseSummary = a?.conciseSummary || a?.executiveSummary || "";

  // Segments from structured AI analysis or live recording
  const segments: TranscriptSegment[] = useMemo(() => {
    if (meeting.transcriptSegments && meeting.transcriptSegments.length > 0) {
      return meeting.transcriptSegments;
    }
    // Parse raw transcript lines if segments not directly arrayed
    if (meeting.transcript) {
      const lines = meeting.transcript.split("\n").filter((l) => l.trim().length > 0);
      return lines.map((line, idx) => {
        const match = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:([^:]+):)?\s*(.*)$/);
        if (match) {
          const timeFormatted = match[1];
          const speaker = match[2]?.trim() || "Participante";
          const text = match[3]?.trim() || line;
          return {
            id: `seg-parsed-${idx}`,
            startTime: parseTimeToSeconds(timeFormatted),
            timeFormatted,
            speaker,
            text,
          };
        }
        return {
          id: `seg-raw-${idx}`,
          startTime: Math.round((idx / Math.max(1, lines.length)) * (meeting.duration || 60)),
          timeFormatted: "00:00",
          speaker: "Participante",
          text: line,
        };
      });
    }
    return [];
  }, [meeting.transcriptSegments, meeting.transcript, meeting.duration]);

  const filteredSegments = useMemo(() => {
    if (!transcriptSearch.trim()) return segments;
    const q = transcriptSearch.toLowerCase();
    return segments.filter(
      (s) => s.text.toLowerCase().includes(q) || (s.speaker && s.speaker.toLowerCase().includes(q))
    );
  }, [segments, transcriptSearch]);

  const handleToggleAction = (actionId: string) => {
    const updatedActions = actionItems.map((act) =>
      act.id === actionId ? { ...act, completed: !act.completed } : act
    );
    const updatedAnalysis = { ...a, actionItems: updatedActions };
    onUpdateMeeting({ analysis: updatedAnalysis });
  };

  const handleAddAction = () => {
    if (!newActionTask.trim()) return;
    const newAct: ActionItem = {
      id: `act-${Date.now()}`,
      task: newActionTask.trim(),
      assignee: newActionAssignee.trim() || "Responsável a definir",
      completed: false,
      priority: "Média",
      deadline: "A definir",
    };
    const updatedAnalysis = { ...a, actionItems: [...actionItems, newAct] };
    onUpdateMeeting({ analysis: updatedAnalysis });
    setNewActionTask("");
    setNewActionAssignee("");
  };

  const handleCopyTranscript = () => {
    if (meeting.transcript) {
      navigator.clipboard.writeText(meeting.transcript);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    }
  };

  const handleSeek = (timestamp: number) => {
    if (onSeekToTimestamp) {
      onSeekToTimestamp(timestamp);
    }
  };

  const renderHighlightedText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={i} className="bg-blue-500/30 text-blue-200 font-bold px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Meta Summary Card */}
      <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#22252D] pb-2.5">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] text-[#C4C7D0] font-semibold">
              Data: {new Date(meeting.createdAt).toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#8E929E]" />
            <span className="text-[11px] text-[#C4C7D0] font-mono">Duração: {meeting.durationFormatted}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
              {a?.mode === "ai" ? "Processado com IA Gemini" : "Processado Local Offline"}
            </span>
          </div>
        </div>

        {/* Concise Summary / Resumo Executivo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold text-[#8E929E] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Resumo Conciso dos Pontos Discutidos
            </h3>
            <span className="text-[10px] text-blue-400 font-mono">Síntese Inteligente</span>
          </div>
          <p className="text-xs text-[#EDEDED] leading-relaxed bg-[#0E1015] p-3.5 rounded-lg border border-[#22252D]">
            {conciseSummary || "Nenhum resumo gerado ainda. Clique em 'Analisar com Gemini IA' acima para obter o resumo conciso e transcrição detalhada."}
          </p>
        </div>

        {/* Key Discussion Points / Pontos Principais & Deliberações */}
        {keyPoints.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <h3 className="text-[11px] font-bold text-[#8E929E] uppercase tracking-wider flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5 text-blue-400" />
              Pontos Principais & Deliberações da Reunião
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {keyPoints.map((kp, idx) => (
                <div
                  key={idx}
                  className="text-xs text-[#C4C7D0] flex items-start gap-2 bg-[#0E1015] p-2.5 rounded-lg border border-[#22252D]"
                >
                  <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] flex items-center justify-center shrink-0 border border-blue-500/30">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{kp}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Items / Tarefas */}
      <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-[#8E929E] uppercase tracking-wider flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
            Plano de Ação & Tarefas ({actionItems.filter((i) => i.completed).length}/{actionItems.length})
          </h3>
        </div>

        {/* Action list */}
        <div className="space-y-1.5">
          {actionItems.length === 0 ? (
            <p className="text-xs text-[#6B7280] italic py-1">Nenhuma tarefa pendente registrada.</p>
          ) : (
            actionItems.map((act) => (
              <div
                key={act.id}
                onClick={() => handleToggleAction(act.id)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                  act.completed
                    ? "bg-[#0E1015]/40 border-[#22252D]/60 opacity-60 text-[#6B7280] line-through"
                    : "bg-[#0E1015] border-[#22252D] hover:border-blue-500/40 text-[#EDEDED]"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {act.completed ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-[#6B7280] shrink-0" />
                  )}
                  <span className="text-xs font-semibold">{act.task}</span>
                </div>

                {act.assignee && (
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#1C1F26] text-[#8E929E] border border-[#2A2D35] shrink-0">
                    {act.assignee}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add quick action */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#22252D]">
          <input
            type="text"
            value={newActionTask}
            onChange={(e) => setNewActionTask(e.target.value)}
            placeholder="Nova tarefa ou compromisso da reunião..."
            className="flex-1 min-w-[180px] bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none"
          />
          <input
            type="text"
            value={newActionAssignee}
            onChange={(e) => setNewActionAssignee(e.target.value)}
            placeholder="Responsável (opcional)"
            className="w-36 bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddAction}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#1C1F26] hover:bg-[#252830] text-[#EDEDED] border border-[#2A2D35] transition cursor-pointer"
          >
            Adicionar Ação
          </button>
        </div>
      </div>

      {/* Interactive Timecoded Transcript Box */}
      <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[11px] font-bold text-[#8E929E] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Transcrição Sincronizada com Áudio ({segments.length} trechos)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Search inside transcript */}
            <div className="relative">
              <Search className="w-3 h-3 text-[#8E929E] absolute left-2.5 top-2" />
              <input
                type="text"
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder="Filtrar transcrição..."
                className="bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg pl-7 pr-6 py-1 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none w-44 sm:w-56"
              />
              {transcriptSearch && (
                <button
                  onClick={() => setTranscriptSearch("")}
                  className="absolute right-2 top-1.5 text-[#8E929E] hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={handleCopyTranscript}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] transition cursor-pointer"
            >
              {copiedTranscript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedTranscript ? "Copiado!" : "Copiar"}</span>
            </button>
          </div>
        </div>

        {/* Timecoded Segments Player List */}
        <div className="p-2 rounded-lg bg-[#0E1015] border border-[#22252D] max-h-96 overflow-y-auto space-y-1.5 font-sans">
          {filteredSegments.length === 0 ? (
            <p className="text-xs text-[#6B7280] italic p-3 text-center">
              {transcriptSearch
                ? `Nenhum trecho encontrado com "${transcriptSearch}".`
                : "Nenhuma transcrição disponível para esta reunião. Clique em 'Analisar com Gemini IA' para transcrever."}
            </p>
          ) : (
            filteredSegments.map((seg) => (
              <div
                key={seg.id}
                onClick={() => handleSeek(seg.startTime)}
                className="p-2.5 rounded-lg border border-transparent hover:border-blue-500/40 hover:bg-[#14161B] transition-all cursor-pointer group flex items-start gap-2.5"
                title={`Clique para pular o áudio para ${seg.timeFormatted || "00:00"}`}
              >
                {/* Clickable timecode badge */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSeek(seg.startTime);
                  }}
                  className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 group-hover:bg-blue-600 group-hover:text-white transition shrink-0"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  {seg.timeFormatted || "00:00"}
                </button>

                <div className="space-y-0.5 flex-1 min-w-0">
                  {seg.speaker && (
                    <span className="text-[10px] font-semibold text-[#8E929E] block">
                      {seg.speaker}:
                    </span>
                  )}
                  <p className="text-xs text-[#C4C7D0] leading-relaxed group-hover:text-white transition">
                    {renderHighlightedText(seg.text, transcriptSearch)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
