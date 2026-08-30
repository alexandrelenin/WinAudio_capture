import React from "react";
import { Mic, Volume2, HardDrive, Sparkles, HelpCircle, Layers, Search } from "lucide-react";

interface HeaderProps {
  activeTab: "recorder" | "library" | "details";
  setActiveTab: (tab: "recorder" | "library" | "details") => void;
  isRecording: boolean;
  recordingTime: string;
  hasSelectedMeeting: boolean;
  onOpenWindowsGuide: () => void;
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isRecording,
  recordingTime,
  hasSelectedMeeting,
  onOpenWindowsGuide,
  onOpenSearch,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0E1015]/95 backdrop-blur-md border-b border-[#22252D] text-[#EDEDED] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand & Windows Icon */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30 text-white font-bold">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                WinAudio <span className="text-blue-400 font-medium text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/20">MP3 & Requisitos</span>
              </h1>
            </div>
            <p className="text-[11px] text-[#8E929E] leading-tight hidden sm:block">Captura de Áudio PC • Transcrição • Engenharia de Requisitos</p>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="flex items-center gap-1 bg-[#14161B] p-1 rounded-lg border border-[#22252D]">
          <button
            onClick={() => setActiveTab("recorder")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "recorder"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Gravador & Mixer</span>
            {isRecording && (
              <span className="flex items-center gap-1 text-[10px] bg-red-500 text-white px-1.5 py-0.2 rounded-full animate-pulse font-mono font-bold ml-1">
                ● {recordingTime}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "library"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Arquivos & Biblioteca</span>
          </button>

          {hasSelectedMeeting && (
            <button
              onClick={() => setActiveTab("details")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "details"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Estúdio & IA</span>
            </button>
          )}
        </nav>

        {/* Windows, Search & Helper Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14161B] hover:bg-[#1E212A] text-[#C4C7D0] hover:text-white border border-[#22252D] transition cursor-pointer"
            title="Buscar palavras-chave e timecodes (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Buscar Áudio</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 rounded bg-[#0A0B0D] border border-[#22252D] text-[10px] text-[#8E929E] font-mono">
              Ctrl+K
            </kbd>
          </button>

          <button
            onClick={onOpenWindowsGuide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14161B] hover:bg-[#1E212A] text-[#C4C7D0] hover:text-white border border-[#22252D] transition cursor-pointer"
            title="Como capturar áudio do sistema no Windows 10/11"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Guia Windows</span>
          </button>

          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Offline Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
};
