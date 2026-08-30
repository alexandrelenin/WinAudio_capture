import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Play,
  Clock,
  FileAudio,
  Sparkles,
  Layers,
  Bookmark,
  ArrowRight,
  Filter,
} from "lucide-react";
import { MeetingRecord, KeywordSearchResult } from "../types";
import { searchAudioFiles } from "../utils/searchUtils";

interface AudioKeywordSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetings: MeetingRecord[];
  onSelectResult: (meetingId: string, timestamp: number) => void;
}

export const AudioKeywordSearchModal: React.FC<AudioKeywordSearchModalProps> = ({
  isOpen,
  onClose,
  meetings,
  onSelectResult,
}) => {
  const [query, setQuery] = useState<string>("");
  const [selectedMeetingFilter, setSelectedMeetingFilter] = useState<string>("all");

  const popularKeywords = [
    "Requisito",
    "Segurança",
    "Prazo",
    "API",
    "Banco de Dados",
    "Sprint",
    "Performance",
    "Decisão",
    "Windows",
  ];

  const searchResults: KeywordSearchResult[] = useMemo(() => {
    if (!query.trim()) return [];
    const pool =
      selectedMeetingFilter === "all"
        ? meetings
        : meetings.filter((m) => m.id === selectedMeetingFilter);
    return searchAudioFiles(pool, query);
  }, [meetings, query, selectedMeetingFilter]);

  if (!isOpen) return null;

  const highlightKeywordInText = (text: string, highlight: string) => {
    if (!highlight.trim()) return text;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark
          key={i}
          className="bg-blue-500/30 text-blue-200 font-bold px-1 py-0.5 rounded border border-blue-500/40"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-[#14161B] border border-[#22252D] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#EDEDED]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Box */}
        <div className="p-4 border-b border-[#22252D] bg-[#0E1015] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <Search className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Busca de Palavras-Chave & Timecodes nos Áudios
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#8E929E] hover:text-white hover:bg-[#1C1F26] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#8E929E] absolute left-3.5 top-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite um termo para localizar no áudio (ex: Pix, RF01, prazo, segurança, arquitetura)..."
              autoFocus
              className="w-full bg-[#14161B] border border-[#2A2D35] focus:border-blue-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#6B7280] focus:outline-none shadow-inner"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-2.5 text-[#8E929E] hover:text-white text-xs px-1.5 py-0.5 rounded bg-[#1C1F26]"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Quick Keywords & Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-[#6B7280] mr-1">Sugestões:</span>
              {popularKeywords.map((kw) => (
                <button
                  key={kw}
                  type="button"
                  onClick={() => setQuery(kw)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition cursor-pointer ${
                    query.toLowerCase() === kw.toLowerCase()
                      ? "bg-blue-600 text-white border-blue-500 shadow-sm"
                      : "bg-[#1C1F26] text-[#C4C7D0] border-[#2A2D35] hover:bg-[#252830] hover:text-white"
                  }`}
                >
                  {kw}
                </button>
              ))}
            </div>

            {/* Filter by meeting */}
            {meetings.length > 1 && (
              <select
                value={selectedMeetingFilter}
                onChange={(e) => setSelectedMeetingFilter(e.target.value)}
                className="bg-[#1C1F26] border border-[#2A2D35] rounded-lg px-2 py-1 text-[11px] text-[#C4C7D0] focus:outline-none"
              >
                <option value="all">Todas as Reuniões ({meetings.length})</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {!query.trim() ? (
            <div className="text-center py-12 text-[#6B7280] space-y-2">
              <Clock className="w-8 h-8 mx-auto text-[#4B5563]" />
              <p className="text-xs font-semibold text-[#EDEDED]">
                Localize instantaneamente qualquer momento falado em suas gravações
              </p>
              <p className="text-[11px] text-[#8E929E] max-w-md mx-auto">
                Digite palavras-chave para listar os timecodes exatos com trechos transcritos e pular a reprodução do áudio direto para o minuto correto.
              </p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-10 text-[#8E929E] space-y-1.5">
              <p className="text-xs font-bold text-[#EDEDED]">Nenhuma menção encontrada para "{query}"</p>
              <p className="text-[11px] text-[#6B7280]">
                Tente buscar sinônimos ou termos mais curtos. Certifique-se de que a reunião possui transcrição ativa ou gerada por IA.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-[#8E929E] px-1 pb-1">
                <span>
                  {searchResults.length} menç{searchResults.length === 1 ? "ão" : "ões"} com timecodes destacados
                </span>
                <span className="text-[10px] font-mono text-blue-400">Clique para reproduzir no ponto</span>
              </div>

              {searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => {
                    onSelectResult(res.meetingId, res.timestamp);
                    onClose();
                  }}
                  className="bg-[#0E1015] border border-[#22252D] hover:border-blue-500/60 rounded-xl p-3 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow-blue-500/10"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Timecode Badge */}
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 group-hover:bg-blue-600 group-hover:text-white transition">
                        <Clock className="w-3 h-3" />
                        {res.timeFormatted}
                      </span>

                      <span className="text-xs font-bold text-white group-hover:text-blue-300 transition">
                        {res.meetingTitle}
                      </span>

                      {res.speaker && (
                        <span className="text-[10px] text-[#8E929E] px-1.5 py-0.2 rounded bg-[#1C1F26]">
                          {res.speaker}
                        </span>
                      )}

                      <span className="text-[10px] uppercase font-bold text-[#6B7280]">
                        {res.source === "transcript"
                          ? "Transcrição"
                          : res.source === "marker"
                          ? "Marcador"
                          : res.source === "requirement"
                          ? "Requisito"
                          : "Resumo"}
                      </span>
                    </div>

                    <p className="text-xs text-[#C4C7D0] leading-relaxed pt-0.5 font-sans">
                      {highlightKeywordInText(res.textSnippet, query)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <span className="text-[11px] font-semibold text-blue-400 group-hover:underline flex items-center gap-1">
                      <Play className="w-3 h-3 fill-blue-400" /> Pular para {res.timeFormatted}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0E1015] border-t border-[#22252D] flex items-center justify-between text-xs text-[#8E929E]">
          <span>Dica: Pressione Esc para fechar a busca</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#1C1F26] hover:bg-[#252830] text-[#EDEDED] border border-[#2A2D35]"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
