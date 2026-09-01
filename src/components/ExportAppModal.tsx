import React, { useState } from "react";
import {
  X,
  Laptop,
  Smartphone,
  Download,
  Copy,
  Check,
  Terminal,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Monitor,
} from "lucide-react";

interface ExportAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportAppModal: React.FC<ExportAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"windows" | "mobile" | "pwa">("windows");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const windowsTauriCode = `# 1. Instale o Tauri CLI ou Electron
npm install -D @tauri-apps/cli

# 2. Inicialize a aplicação desktop nativa
npx tauri init

# 3. Compile o executável (.exe) standalone para Windows
npm run build
npx tauri build`;

  const windowsElectronCode = `# Opção com Electron:
npm install -D electron electron-builder

# Adicione no package.json: "electron:build": "electron-builder --windows"
npm run build
npx electron-builder --win`;

  const mobileCapacitorCode = `# 1. Adicione o Capacitor para Android e iOS
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios

# 2. Inicialize o projeto mobile
npx cap init "MeetingMinutesAI" "com.company.meetingai"

# 3. Gere o build e adicione a plataforma Android / iOS
npm run build
npx cap add android
npx cap open android # Abre o Android Studio para gerar o APK`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#12141A] border border-[#262A36] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#EDEDED]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22252F] bg-[#171A23]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Laptop className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                Versões Windows Executável (.exe) & Celular
              </h2>
              <p className="text-xs text-[#8E929E]">
                Guia e comandos para empacotar o aplicativo nativamente para Desktop (Windows) e Mobile (Android/iOS).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E929E] hover:text-white hover:bg-[#22252F] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex border-b border-[#22252F] bg-[#161820] px-6">
          <button
            onClick={() => setActiveTab("windows")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === "windows"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-[#8E929E] hover:text-white"
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span>Windows (.exe / Desktop)</span>
          </button>
          <button
            onClick={() => setActiveTab("mobile")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === "mobile"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-[#8E929E] hover:text-white"
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Celular (Android APK / iOS)</span>
          </button>
          <button
            onClick={() => setActiveTab("pwa")}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition cursor-pointer ${
              activeTab === "pwa"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-[#8E929E] hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>PWA (Instalação 1-Click Direto)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-[#C4C7D0]">
          {activeTab === "windows" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-500/20 text-blue-200">
                <p className="font-semibold text-xs flex items-center gap-1.5 text-blue-300">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  Como transformar em um aplicativo executável (.exe) para Windows:
                </p>
                <p className="text-[11px] text-blue-300/80 mt-1">
                  Este app foi construído com arquitetura modular Vite + React + Node. Você pode empacotá-lo em menos de 2 minutos usando <strong>Tauri</strong> (recomendado para instalador leve de ~5MB) ou <strong>Electron</strong>.
                </p>
              </div>

              {/* Option A: Tauri */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Opção 1: Tauri (Mais leve, rápido e com menor consumo de RAM)</span>
                  <button
                    onClick={() => handleCopy(windowsTauriCode, 1)}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 transition cursor-pointer"
                  >
                    {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === 1 ? "Copiado!" : "Copiar Comandos"}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#0A0C10] border border-[#22252F] rounded-xl font-mono text-[11px] text-blue-200 overflow-x-auto">
                  {windowsTauriCode}
                </pre>
              </div>

              {/* Option B: Electron */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Opção 2: Electron (Compatibilidade total com Node.js backend)</span>
                  <button
                    onClick={() => handleCopy(windowsElectronCode, 2)}
                    className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20 transition cursor-pointer"
                  >
                    {copiedIndex === 2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === 2 ? "Copiado!" : "Copiar Comandos"}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#0A0C10] border border-[#22252F] rounded-xl font-mono text-[11px] text-purple-200 overflow-x-auto">
                  {windowsElectronCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "mobile" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-200">
                <p className="font-semibold text-xs flex items-center gap-1.5 text-purple-300">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  Compilação para Celular (Android APK e iOS):
                </p>
                <p className="text-[11px] text-purple-300/80 mt-1">
                  Usando o <strong>Capacitor</strong> (do ecossistema Ionic), este projeto roda nativamente como um app instalado no Android ou iPhone, com acesso total a gravação de microfone de alta qualidade.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Passos para gerar o APK no Android Studio</span>
                  <button
                    onClick={() => handleCopy(mobileCapacitorCode, 3)}
                    className="flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-500/20 transition cursor-pointer"
                  >
                    {copiedIndex === 3 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === 3 ? "Copiado!" : "Copiar Comandos"}</span>
                  </button>
                </div>
                <pre className="p-3 bg-[#0A0C10] border border-[#22252F] rounded-xl font-mono text-[11px] text-purple-200 overflow-x-auto">
                  {mobileCapacitorCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "pwa" && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/20 text-emerald-200">
                <p className="font-semibold text-xs flex items-center gap-1.5 text-emerald-300">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Instalação Imediata sem precisar compilar (PWA):
                </p>
                <p className="text-[11px] text-emerald-300/80 mt-1">
                  Você pode instalar o app diretamente no Windows ou no Celular pelo próprio navegador (Chrome, Edge ou Safari), criando um ícone na barra de tarefas e rodando em janela isolada sem barra de endereço.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-[#161820] border border-[#22252F] space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Monitor className="w-4 h-4 text-blue-400" />
                    <span>No Windows (Edge / Chrome)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#8E929E]">
                    <li>Abra a aplicação em tela cheia no Chrome ou Edge.</li>
                    <li>Clique no ícone de <strong>"Instalar aplicativo"</strong> na barra de endereços (ao lado da estrela de favoritos).</li>
                    <li>O app será fixado no menu Iniciar e na Barra de Tarefas do Windows como um executável nativo.</li>
                  </ol>
                </div>

                <div className="p-4 rounded-xl bg-[#161820] border border-[#22252F] space-y-2">
                  <div className="flex items-center gap-2 text-white font-semibold">
                    <Smartphone className="w-4 h-4 text-purple-400" />
                    <span>No Celular (Android / iOS)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-[#8E929E]">
                    <li>Abra o link da aplicação no Chrome (Android) ou Safari (iPhone).</li>
                    <li>Toque nos 3 pontinhos (ou no botão de Compartilhar do Safari).</li>
                    <li>Selecione <strong>"Adicionar à Tela de Início"</strong> ou <strong>"Instalar App"</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#22252F] bg-[#171A23]">
          <span className="text-[11px] text-[#8E929E]">
            Você pode exportar o código completo ZIP pelo menu superior do AI Studio.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 transition cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
