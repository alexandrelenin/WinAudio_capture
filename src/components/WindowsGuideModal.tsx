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
  Film,
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
                Guia de Gravação de Tela & Áudio no Windows
              </h2>
              <p className="text-[11px] text-[#8E929E]">
                Como gravar a tela, apresentações e o som do PC (Meet, Zoom, Teams, YouTube)
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

        {/* Section 0: Screen Recording */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            1. Como Gravar a Tela com Áudio Sincronizado (Vídeo HD)
          </h3>
          <div className="bg-[#0E1015] border border-[#22252D] rounded-xl p-3.5 space-y-2 text-xs text-[#C4C7D0] leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-emerald-500/30">
                1
              </span>
              <p>
                No topo do gravador, selecione a opção <strong>"Gravar Tela do PC + Áudio"</strong> e escolha a resolução (1080p ou 720p).
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-emerald-500/30">
                2
              </span>
              <p>
                Ao clicar em <em>Iniciar Gravação</em>, a janela do Windows exibirá as opções: <strong>"Tela Inteira"</strong>, <strong>"Janela"</strong> ou <strong>"Guia do Navegador"</strong>.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 border border-emerald-500/30">
                3
              </span>
              <p className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/30 text-emerald-200 font-medium">
                🎬 <strong>Áudio Sincronizado:</strong> Marque a caixa <u>"Compartilhar áudio do sistema"</u> no canto inferior esquerdo para que o som da reunião/vídeo seja gravado junto com a imagem.
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: System Audio Capture */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5" />
            2. Como Capturar o Áudio Interno do PC (Apenas Áudio MP3)
          </h3>
          <div className="bg-[#0E1015] border border-[#22252D] rounded-xl p-3.5 space-y-2 text-xs text-[#C4C7D0] leading-relaxed">
            <p>
              Selecione <strong>"Apenas Áudio (MP3)"</strong> caso deseje economizar espaço em disco e focar exclusivamente nas vozes dos participantes para gerar atas de reunião e requisitos por IA.
            </p>
          </div>
        </div>

        {/* Section 2: Channel Separation & Dual Mix */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5" />
            3. Separação de Canais Estéreo & Identificação de Vozes (Google Meet / Zoom)
          </h3>
          <div className="text-xs text-[#C4C7D0] leading-relaxed bg-[#0E1015] p-3.5 rounded-lg border border-[#22252D] space-y-2">
            <p>
              Com o modo <strong>"Separação de Canais (L/R)"</strong>, o gravador isola o seu microfone no <strong>Canal Esquerdo (L)</strong> e as vozes remotas da reunião no <strong>Canal Direito (R)</strong>.
            </p>
            <p className="text-[11px] text-[#8E929E]">
              💡 <strong>Como a IA identifica quem falou:</strong> O modelo Gemini analisa os canais estéreo e cruza com a lista de <em>Participantes</em> e as <em>Legendas/CC</em> informadas, garantindo que suas falas nunca se misturem com as falas dos outros participantes na transcrição e na ata!
            </p>
          </div>
        </div>

        {/* Section 3: Offline & Windows Security */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            4. Armazenamento Local Seguro & Suporte Offline
          </h3>
          <p className="text-xs text-[#C4C7D0] leading-relaxed bg-[#0E1015] p-3 rounded-lg border border-[#22252D]">
            Todos os vídeos de tela gravados, áudios MP3, transcrições e requisitos ficam armazenados na base de dados <strong>IndexedDB local</strong> do seu computador. Você pode exportar o vídeo, baixar o áudio MP3 ou relatórios em Markdown/CSV a qualquer momento.
          </p>
        </div>

        {/* Section 4: Windows Shortcuts */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            <Keyboard className="w-3.5 h-3.5" />
            5. Atalhos de Teclado no Windows
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
