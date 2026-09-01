import React from "react";
import {
  Mic,
  Volume2,
  HardDrive,
  Sparkles,
  HelpCircle,
  Search,
  Settings,
  Laptop,
  Cpu,
} from "lucide-react";
import { AISettings } from "../types";

interface HeaderProps {
  activeTab: "recorder" | "library" | "details";
  setActiveTab: (tab: "recorder" | "library" | "details") => void;
  isRecording: boolean;
  recordingTime: string;
  hasSelectedMeeting: boolean;
  onOpenWindowsGuide: () => void;
  onOpenSearch: () => void;
  onOpenAISettings: () => void;
  onOpenExportApp: () => void;
  aiSettings?: AISettings;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isRecording,
  recordingTime,
  hasSelectedMeeting,
  onOpenWindowsGuide,
  onOpenSearch,
  onOpenAISettings,
  onOpenExportApp,
  aiSettings,
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
                WinAudio <span className="text-blue-400 font-medium text-[10px] px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/20">MP3 & Reuniões</span>
              </h1>
            </div>
            <p className="text-[11px] text-[#8E929E] leading-tight hidden sm:block">
              Captura PC & Mic • Transcrição • Templates de Reunião
            </p>
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

        {/* Action buttons: AI settings, Windows exe/mobile, Search, Windows Guide */}
        <div className="flex items-center gap-2">
          {/* AI Settings button with active model tag */}
          <button
            onClick={onOpenAISettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14161B] hover:bg-[#1E212A] text-[#C4C7D0] hover:text-white border border-[#22252D] hover:border-blue-500/40 transition cursor-pointer"
            title="Configurar Provedor de IA (Gemini, OpenAI, Anthropic, Groq, Ollama) e Chaves de API"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">IA & Modelos</span>
            {aiSettings?.model && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hidden xl:inline">
                {aiSettings.model.replace("gemini-", "").replace("claude-", "")}
              </span>
            )}
          </button>

          {/* Windows / Mobile Export guide button */}
          <button
            onClick={onOpenExportApp}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14161B] hover:bg-[#1E212A] text-[#C4C7D0] hover:text-white border border-[#22252D] hover:border-purple-500/40 transition cursor-pointer"
            title="Gerar Versão .EXE para Windows ou App para Celular"
          >
            <Laptop className="w-3.5 h-3.5 text-purple-400" />
            <span className="hidden lg:inline">.EXE & Celular</span>
          </button>

          {/* Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14161B] hover:bg-[#1E212A] text-[#C4C7D0] hover:text-white border border-[#22252D] transition cursor-pointer"
            title="Buscar palavras-chave e timecodes (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Buscar</span>
          </button>

          {/* Windows Guide */}
          <button
            onClick={onOpenWindowsGuide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14161B] hover:bg-[#1E212A] text-[#C4C7D0] hover:text-white border border-[#22252D] transition cursor-pointer"
            title="Como capturar áudio do sistema no Windows 10/11"
          >
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Guia Windows</span>
          </button>
        </div>
      </div>
    </header>
  );
};

