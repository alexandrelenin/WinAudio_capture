import React, { useState, useRef } from "react";
import {
  Search,
  Upload,
  HardDrive,
  Star,
  Trash2,
  Download,
  Sparkles,
  FileAudio,
  Calendar,
  Clock,
  Tag,
  ArrowUpDown,
  Plus,
  Play,
  FileCode,
  Film,
  Video,
} from "lucide-react";
import { MeetingRecord } from "../types";
import { formatTime, formatBytes } from "../utils/audioEncoder";
import { downloadBlob, exportMeetingAsJSON, exportMeetingAsMarkdown } from "../utils/exportUtils";
import { analyzeMeetingLocallyOffline } from "../utils/offlineAnalyzer";
import { saveMeetingToDB } from "../utils/db";

interface FileManagerProps {
  meetings: MeetingRecord[];
  selectedMeetingId: string | null;
  onSelectMeeting: (id: string) => void;
  onDeleteMeeting: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onImportMeeting: (meeting: MeetingRecord) => void;
  onTriggerAiAnalysis: (meeting: MeetingRecord) => void;
  isAiAnalyzing: boolean;
}

export const FileManager: React.FC<FileManagerProps> = ({
  meetings,
  selectedMeetingId,
  onSelectMeeting,
  onDeleteMeeting,
  onToggleFavorite,
  onImportMeeting,
  onTriggerAiAnalysis,
  isAiAnalyzing,
}) => {
  const [search, setSearch] = useState<string>("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<"all" | "audio" | "video">("all");
  const [onlyFavorites, setOnlyFavorites] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Extract all unique tags
  const allTags = Array.from(new Set(meetings.flatMap((m) => m.tags || [])));

  const filteredMeetings = meetings.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      (m.transcript && m.transcript.toLowerCase().includes(search.toLowerCase())) ||
      (m.tags && m.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())));
    const matchesTag = selectedTag === "all" || (m.tags && m.tags.includes(selectedTag));
    const isVideo = Boolean(m.videoBlob || m.videoUrl || m.mediaType === "video");
    const matchesType =
      selectedType === "all" ||
      (selectedType === "video" && isVideo) ||
      (selectedType === "audio" && !isVideo);
    const matchesFav = !onlyFavorites || m.favorite;
    return matchesSearch && matchesTag && matchesType && matchesFav;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleProcessMediaFile(files[0]);
  };

  const handleProcessMediaFile = async (file: File) => {
    const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mkv|mov)$/i.test(file.name);
    let duration = 60;

    try {
      if (!isVideo) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        duration = Math.round(audioBuffer.duration);
        audioCtx.close();
      } else {
        // Estimate or extract video duration
        const video = document.createElement("video");
        video.preload = "metadata";
        video.src = URL.createObjectURL(file);
        await new Promise((res) => {
          video.onloadedmetadata = () => {
            if (video.duration && !isNaN(video.duration)) {
              duration = Math.round(video.duration);
            }
            URL.revokeObjectURL(video.src);
            res(true);
          };
          video.onerror = () => res(false);
        });
      }
    } catch (e) {
      console.warn("Could not calculate duration locally, using default:", e);
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
    const offlineAnalysis = analyzeMeetingLocallyOffline(
      cleanTitle,
      "",
      `Arquivo de ${isVideo ? "vídeo de tela" : "áudio"} importado do computador.`
    );

    const newMeeting: MeetingRecord = {
      id: `imported-${Date.now()}`,
      title: cleanTitle,
      createdAt: new Date().toISOString(),
      duration,
      durationFormatted: formatTime(duration),
      sourceType: "system",
      mediaType: isVideo ? "video" : "audio",
      audioBlob: !isVideo ? file : undefined,
      videoBlob: isVideo ? file : undefined,
      format: isVideo ? "webm" : file.name.endsWith(".mp3") ? "mp3" : "wav",
      fileSizeFormatted: formatBytes(file.size),
      transcript: "",
      offlineNotes: `Arquivo importado: ${file.name}`,
      markers: [],
      tags: isVideo ? ["Importado", "Vídeo de Tela"] : ["Importado", "Áudio"],
      favorite: false,
      analysis: offlineAnalysis,
      chatHistory: [],
    };

    await saveMeetingToDB(newMeeting);
    onImportMeeting(newMeeting);
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter toolbar */}
      <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar gravações de tela, áudios, transcrições ou tags..."
            className="w-full bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Media Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="bg-[#1C1F26] border border-[#2A2D35] rounded-lg px-2.5 py-1.5 text-xs text-[#C4C7D0] focus:outline-none"
          >
            <option value="all">Todos os Tipos (Vídeo & Áudio)</option>
            <option value="video">🎬 Apenas Vídeos de Tela</option>
            <option value="audio">🎙️ Apenas Áudios (MP3)</option>
          </select>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="bg-[#1C1F26] border border-[#2A2D35] rounded-lg px-2.5 py-1.5 text-xs text-[#C4C7D0] focus:outline-none"
            >
              <option value="all">Todas as Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}

          {/* Favorite toggle */}
          <button
            onClick={() => setOnlyFavorites(!onlyFavorites)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
              onlyFavorites
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-[#1C1F26] text-[#8E929E] hover:text-white border-[#2A2D35]"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavorites ? "fill-amber-400 text-amber-400" : ""}`} />
            <span>Favoritos</span>
          </button>

          {/* Import Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="audio/*,video/*,.mp3,.wav,.m4a,.webm,.mp4"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar Mídia</span>
          </button>
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = e.dataTransfer.files;
          if (files && files.length > 0) {
            handleProcessMediaFile(files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "border-[#2A2D35] bg-[#14161B]/60 hover:bg-[#14161B] hover:border-[#3E424D]"
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-blue-400 mb-1.5">
          <Upload className="w-5 h-5" />
          <Film className="w-4 h-4 text-emerald-400" />
        </div>
        <p className="text-xs font-semibold text-[#EDEDED]">
          Arraste e solte gravações de tela ou arquivos de áudio (MP4, WebM, MP3, WAV, M4A)
        </p>
        <p className="text-[11px] text-[#6B7280] mt-0.5">
          Armazenado localmente com segurança offline em seu computador para transcrição e análise IA imediata.
        </p>
      </div>

      {/* Meeting Cards List */}
      {filteredMeetings.length === 0 ? (
        <div className="text-center py-12 bg-[#14161B] border border-[#22252D] rounded-xl p-6 text-[#6B7280] space-y-2">
          <HardDrive className="w-8 h-8 text-[#4B5563] mx-auto" />
          <h3 className="text-xs font-bold text-[#EDEDED]">Nenhuma gravação encontrada</h3>
          <p className="text-xs text-[#8E929E] max-w-sm mx-auto">
            Grave uma tela ou áudio pelo gravador ou importe um arquivo existente para começar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredMeetings.map((m) => {
            const isSelected = selectedMeetingId === m.id;
            const rfsCount = m.analysis?.functionalRequirements?.length || 0;
            const isAiDone = m.analysis?.mode === "ai";
            const isVideo = Boolean(m.videoBlob || m.videoUrl || m.mediaType === "video");

            return (
              <div
                key={m.id}
                onClick={() => onSelectMeeting(m.id)}
                className={`bg-[#14161B] border rounded-xl p-4 shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-3 hover:border-blue-500/50 ${
                  isSelected
                    ? "border-blue-500 ring-1 ring-blue-500/40 bg-[#161820]"
                    : "border-[#22252D]"
                }`}
              >
                {/* Top Title & Favorite */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-xs text-white line-clamp-2 leading-snug">
                      {m.title}
                    </h3>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(m.id);
                      }}
                      className="text-[#6B7280] hover:text-amber-400 p-0.5"
                    >
                      <Star className={`w-3.5 h-3.5 ${m.favorite ? "fill-amber-400 text-amber-400" : ""}`} />
                    </button>
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-1">
                    {isVideo ? (
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <Film className="w-2.5 h-2.5 text-emerald-400" />
                        TELA ({m.videoResolution || "1080p"})
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {m.format?.toUpperCase() || "MP3"}
                      </span>
                    )}

                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1C1F26] text-[#C4C7D0] border border-[#2A2D35]">
                      {m.durationFormatted}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1C1F26] text-[#8E929E] border border-[#2A2D35]">
                      {m.fileSizeFormatted || "Local"}
                    </span>
                    {isAiDone ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> IA Ativa
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1C1F26] text-[#8E929E] border border-[#2A2D35]">
                        Offline
                      </span>
                    )}
                  </div>
                </div>

                {/* Brief preview */}
                <p className="text-xs text-[#9CA3AF] line-clamp-2 leading-relaxed">
                  {m.analysis?.executiveSummary || m.transcript || m.offlineNotes || "Sem transcrição."}
                </p>

                {/* Tags & Requirements count */}
                <div className="pt-2 border-t border-[#22252D] flex items-center justify-between text-xs text-[#8E929E]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-blue-400 font-mono text-[11px]">{rfsCount} RFs</span>
                    <span className="text-[#4B5563]">•</span>
                    <span className="text-[10px] text-[#6B7280]">
                      {new Date(m.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {/* Video download if available */}
                    {m.videoBlob && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const filename = `${m.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")}_tela.webm`;
                          downloadBlob(m.videoBlob!, filename);
                        }}
                        className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-[#1C1F26]"
                        title="Baixar Vídeo da Tela (.webm)"
                      >
                        <Film className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* MP3 download */}
                    {m.audioBlob && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const filename = `${m.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")}.mp3`;
                          downloadBlob(m.audioBlob!, filename);
                        }}
                        className="p-1 rounded text-[#8E929E] hover:text-white hover:bg-[#1C1F26]"
                        title="Baixar MP3"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportMeetingAsMarkdown(m);
                      }}
                      className="p-1 rounded text-[#8E929E] hover:text-white hover:bg-[#1C1F26]"
                      title="Exportar Markdown"
                    >
                      <FileCode className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Excluir a gravação "${m.title}"?`)) {
                          onDeleteMeeting(m.id);
                        }
                      }}
                      className="p-1 rounded text-[#8E929E] hover:text-red-400 hover:bg-red-500/10"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* AI trigger CTA if not done */}
                {!isAiDone && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTriggerAiAnalysis(m);
                    }}
                    disabled={isAiAnalyzing}
                    className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-bold bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 transition cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-blue-400" />
                    <span>Análise Profunda Gemini IA</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
