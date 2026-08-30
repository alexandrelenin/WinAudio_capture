import React from "react";
import {
  X,
  Monitor,
  Volume2,
  Mic,
  Keyboard,
  HardDrive,
  Download,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface WindowsGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WindowsGuideModal: React.FC<WindowsGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#14161B] border border-[#22252D] rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-[#EDEDED]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#22252D] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                Guia de Captura de Áudio no Windows 10 & 11
              </h2>
              <p className="text-[11px] text-[#8E929E]">
                Como gravar o som de qualquer reunião (Zoom, Teams, Meet, Discord, YouTube)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E929E] hover:text-white hover:bg-[#1C1F26] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: System Audio Capture */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            1. Como Capturar o Áudio Interno do PC (Sem Microfone)
          </h3>
          <div className="bg-[#0E1015] border border-[#22252D] rounded-xl p-3.5 space-y-2 text-xs text-[#C4C7D0] leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-blue-500/30">
                1
              </span>
              <p>
                No gravador, selecione a fonte <strong>"Áudio do PC"</strong> ou <strong>"Mixagem Dupla"</strong> e clique em <em>Iniciar Captura</em>.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-blue-500/30">
                2
              </span>
              <p>
                Na janela do Windows que abrir, selecione a aba <strong>"Tela Inteira"</strong> (ou a <strong>"Aba"</strong> onde sua reunião está rodando).
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-blue-500/30">
                3
              </span>
              <p className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/30 text-blue-200 font-medium">
                ⚠️ <strong>Passo Crucial:</strong> Marque a caixa de seleção <u>"Compartilhar áudio do sistema"</u> (ou "Também compartilhar áudio da aba") no canto inferior da janela antes de clicar em Compartilhar.
              </p>
            </div>
          </div>
        </div>

        {/* Step 2: Dual Mix */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            2. Modo Mixagem Dupla (PC + Seu Microfone)
          </h3>
          <p className="text-xs text-[#C4C7D0] leading-relaxed bg-[#0E1015] p-3 rounded-lg border border-[#22252D]">
            O modo <strong>Mixagem Dupla</strong> combina os outros participantes que falam pelo computador com a sua própria voz falada no microfone, permitindo gravar a reunião completa com controle individual de volume!
          </p>
        </div>

        {/* Step 3: Offline & Windows Security */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            3. Armazenamento Local Seguro & Suporte Offline
          </h3>
          <p className="text-xs text-[#C4C7D0] leading-relaxed bg-[#0E1015] p-3 rounded-lg border border-[#22252D]">
            Todos os áudios codificados em MP3, transcrições e levantamentos de requisitos ficam armazenados na base de dados <strong>IndexedDB local</strong> do seu navegador Windows. Você pode exportar backups em JSON, CSV ou arquivos MP3 a qualquer momento sem depender de nuvens externas.
          </p>
        </div>

        {/* Step 4: Windows Shortcuts */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" />
            4. Atalhos de Teclado no Windows
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-[#0E1015] border border-[#22252D] flex items-center justify-between">
              <span className="text-[#8E929E]">Gravar / Parar:</span>
              <kbd className="px-2 py-0.5 rounded bg-[#1C1F26] text-blue-400 font-mono font-bold text-[11px] border border-[#2A2D35]">
                Alt + R
              </kbd>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0E1015] border border-[#22252D] flex items-center justify-between">
              <span className="text-[#8E929E]">Marcar Requisito:</span>
              <kbd className="px-2 py-0.5 rounded bg-[#1C1F26] text-amber-400 font-mono font-bold text-[11px] border border-[#2A2D35]">
                Alt + M
              </kbd>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-[#22252D]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition cursor-pointer"
          >
            Entendido, Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
};
