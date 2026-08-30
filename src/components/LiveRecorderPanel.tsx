import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  Monitor,
  Sliders,
  Play,
  Pause,
  Square,
  BookmarkPlus,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Radio,
  Volume2,
  HardDrive,
  Info,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { AudioCaptureEngine } from "../utils/audioRecorder";
import { AudioSourceType, AudioMarker, MeetingRecord, TranscriptSegment } from "../types";
import { formatTime, formatBytes } from "../utils/audioEncoder";
import { saveMeetingToDB } from "../utils/db";
import { analyzeMeetingLocallyOffline } from "../utils/offlineAnalyzer";
import confetti from "canvas-confetti";

interface LiveRecorderPanelProps {
  onMeetingSaved: (meeting: MeetingRecord) => void;
  onOpenWindowsGuide: () => void;
  audioEngineRef: React.MutableRefObject<AudioCaptureEngine | null>;
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
  recordingTime: string;
  setRecordingTime: (t: string) => void;
}

export const LiveRecorderPanel: React.FC<LiveRecorderPanelProps> = ({
  onMeetingSaved,
  onOpenWindowsGuide,
  audioEngineRef,
  isRecording,
  setIsRecording,
  recordingTime,
  setRecordingTime,
}) => {
  const [sourceType, setSourceType] = useState<AudioSourceType>("dual_mix");
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [markers, setMarkers] = useState<AudioMarker[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [liveSegments, setLiveSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState<string>("");
  const [offlineNotes, setOfflineNotes] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("Requisitos, Arquitetura, Windows");
  const [autoAiTranscribe, setAutoAiTranscribe] = useState<boolean>(true);
  const [systemVol, setSystemVol] = useState<number>(1.0);
  const [micVol, setMicVol] = useState<number>(1.0);
  const [markerLabel, setMarkerLabel] = useState<string>("");
  const [markerType, setMarkerType] = useState<AudioMarker["type"]>("requisito");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingMp3, setIsProcessingMp3] = useState<boolean>(false);
  const [processingStatusText, setProcessingStatusText] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Initialize engine instance
  useEffect(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioCaptureEngine();
    }
  }, [audioEngineRef]);

  // Update recording timer
  useEffect(() => {
    let interval: any = null;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        if (audioEngineRef.current) {
          const sec = audioEngineRef.current.getElapsedTime();
          setRecordingTime(formatTime(sec));
        }
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording, isPaused, audioEngineRef, setRecordingTime]);

  // Audio Visualizer Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Dark background gradient (High Density)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, "#0E1015");
      bgGrad.addColorStop(1, "#0A0B0D");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = "rgba(42, 45, 53, 0.6)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (isRecording && audioEngineRef.current && !isPaused) {
        const { timeData, freqData, overallLevel } = audioEngineRef.current.getAudioLevels();

        // 1. Draw Frequency Bars
        const barWidth = (width / freqData.length) * 2.2;
        let x = 0;
        for (let i = 0; i < freqData.length / 2; i++) {
          const barHeight = (freqData[i] / 255) * (height * 0.45);

          const barGrad = ctx.createLinearGradient(0, height - barHeight, 0, height);
          barGrad.addColorStop(0, "#38bdf8");
          barGrad.addColorStop(0.6, "#2563eb");
          barGrad.addColorStop(1, "#1d4ed8");

          ctx.fillStyle = barGrad;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);

          x += barWidth;
        }

        // 2. Draw Oscilloscope Waveform
        ctx.lineWidth = 2.5;
        const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
        waveGrad.addColorStop(0, "#38bdf8");
        waveGrad.addColorStop(0.5, "#60a5fa");
        waveGrad.addColorStop(1, "#a855f7");
        ctx.strokeStyle = waveGrad;
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 8;

        ctx.beginPath();
        const sliceWidth = (width * 1.0) / timeData.length;
        let waveX = 0;

        for (let i = 0; i < timeData.length; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(waveX, y);
          } else {
            ctx.lineTo(waveX, y);
          }
          waveX += sliceWidth;
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // reset

        // Overall level text / meter badge
        ctx.fillStyle = overallLevel > 70 ? "#ef4444" : "#10b981";
        ctx.font = "bold 11px Inter, sans-serif";
        ctx.fillText(`NÍVEL: ${overallLevel}%`, width - 85, 20);
      } else {
        // Idle placeholder wave
        ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        for (let i = 0; i < width; i += 20) {
          const y = height / 2 + Math.sin(i * 0.05 + Date.now() * 0.002) * 4;
          ctx.lineTo(i, y);
        }
        ctx.stroke();

        ctx.fillStyle = "#64748b";
        ctx.font = "12px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
          isPaused ? "GRAVAÇÃO EM SEGUNDO PLANO PAUSADA" : "MODO CONTÍNUO: PRONTO PARA GRAVAR EM SEGUNDO PLANO",
          width / 2,
          height / 2 - 12
        );
        ctx.textAlign = "start";
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isPaused, audioEngineRef]);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveTranscript, interimText, liveSegments]);

  // Keyboard Shortcuts for Windows (Alt+R to start/stop, Alt+M to mark requirement)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        if (isRecording) {
          handleStopRecording();
        } else {
          handleStartRecording();
        }
      } else if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        if (isRecording) {
          handleAddQuickMarker("Requisito Rápido (Alt+M)", "requisito");
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, meetingTitle, sourceType, autoAiTranscribe]);

  const handleStartRecording = async () => {
    setErrorMessage(null);
    try {
      if (!meetingTitle.trim()) {
        const defaultTitle = `Reunião ${new Date().toLocaleDateString("pt-BR")} - ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
        setMeetingTitle(defaultTitle);
      }

      if (!audioEngineRef.current) {
        audioEngineRef.current = new AudioCaptureEngine();
      }

      audioEngineRef.current.setSystemVolume(systemVol);
      audioEngineRef.current.setMicVolume(micVol);

      await audioEngineRef.current.startRecording(sourceType, (chunk, isFinal, seg) => {
        if (isFinal) {
          setLiveTranscript((prev) => (prev ? prev + " " : "") + chunk);
          setInterimText("");
          if (seg) {
            setLiveSegments((prev) => [...prev, seg]);
          }
        } else {
          setInterimText(chunk);
        }
      });

      setIsRecording(true);
      setIsPaused(false);
      setMarkers([]);
      setLiveTranscript("");
      setLiveSegments([]);
      setInterimText("");
    } catch (err: any) {
      console.error("Erro ao iniciar gravação:", err);
      setErrorMessage(err.message || "Não foi possível iniciar a captura de áudio.");
    }
  };

  const handlePauseToggle = () => {
    if (!audioEngineRef.current) return;
    if (isPaused) {
      audioEngineRef.current.resumeRecording();
      setIsPaused(false);
    } else {
      audioEngineRef.current.pauseRecording();
      setIsPaused(true);
    }
  };

  const handleAddQuickMarker = (
    label: string,
    type: AudioMarker["type"] = "requisito",
    note?: string
  ) => {
    if (!audioEngineRef.current || !isRecording) return;
    const marker = audioEngineRef.current.addMarker(label, type, note);
    setMarkers((prev) => [...prev, marker]);
    setMarkerLabel("");
  };

  const handleStopRecording = async () => {
    if (!audioEngineRef.current) return;
    setIsProcessingMp3(true);
    setProcessingStatusText("Codificando áudio diretamente em formato MP3 (192kbps)...");
    setErrorMessage(null);

    try {
      const result = await audioEngineRef.current.stopRecording();
      setIsRecording(false);
      setIsPaused(false);

      const title = meetingTitle.trim() || `Reunião ${new Date().toLocaleDateString("pt-BR")}`;
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      let finalTranscript = (result.liveTranscript || liveTranscript).trim();
      let finalSegments: TranscriptSegment[] = result.transcriptSegments && result.transcriptSegments.length > 0
        ? result.transcriptSegments
        : liveSegments;

      // Base offline analysis
      let initialAnalysis = analyzeMeetingLocallyOffline(
        title,
        finalTranscript,
        offlineNotes,
        result.markers
      );

      // Trigger automatic AI transcription & concise summarization if enabled
      if (autoAiTranscribe) {
        setProcessingStatusText("Executando IA Gemini 3.7: Transcrição & Resumo Conciso...");
        try {
          // Convert audio blob to base64 if audio exists
          let audioBase64: string | undefined;
          let mimeType: string = "audio/mp3";

          if (result.mp3Blob && result.mp3Blob.size > 0 && result.mp3Blob.size < 15 * 1024 * 1024) {
            const buffer = await result.mp3Blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = "";
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
            }
            audioBase64 = btoa(binary);
            mimeType = result.mp3Blob.type || "audio/mp3";
          }

          const res = await fetch("/api/transcribe-and-summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              audioBase64,
              mimeType,
              transcript: finalTranscript,
              notes: offlineNotes,
              markers: result.markers,
            }),
          });

          if (res.ok) {
            const aiData = await res.json();
            if (aiData.transcription) {
              finalTranscript = aiData.transcription;
            }
            if (aiData.transcriptSegments && aiData.transcriptSegments.length > 0) {
              finalSegments = aiData.transcriptSegments;
            }

            initialAnalysis = {
              ...initialAnalysis,
              mode: "ai",
              executiveSummary: aiData.executiveSummary || aiData.conciseSummary || initialAnalysis.executiveSummary,
              conciseSummary: aiData.conciseSummary || aiData.executiveSummary || initialAnalysis.conciseSummary,
              keyPoints: aiData.keyDiscussionPoints || aiData.keyPoints || initialAnalysis.keyPoints,
              keyDiscussionPoints: aiData.keyDiscussionPoints || initialAnalysis.keyDiscussionPoints,
              actionItems: aiData.actionItems || initialAnalysis.actionItems,
              functionalRequirements: aiData.functionalRequirements || initialAnalysis.functionalRequirements,
              nonFunctionalRequirements: aiData.nonFunctionalRequirements || initialAnalysis.nonFunctionalRequirements,
              userStories: aiData.userStories || initialAnalysis.userStories,
              studyGuide: aiData.studyGuide || initialAnalysis.studyGuide,
            };
          }
        } catch (aiErr) {
          console.warn("AI Auto-transcription fallback to offline heuristic:", aiErr);
        }
      }

      const record: MeetingRecord = {
        id: `meet-${Date.now()}`,
        title,
        createdAt: new Date().toISOString(),
        duration: result.duration,
        durationFormatted: formatTime(result.duration),
        sourceType,
        audioBlob: result.mp3Blob,
        format: "mp3",
        fileSizeFormatted: formatBytes(result.mp3Blob.size),
        transcript: finalTranscript,
        transcriptSegments: finalSegments,
        offlineNotes,
        markers: result.markers,
        tags,
        favorite: false,
        analysis: initialAnalysis,
        chatHistory: [],
      };

      await saveMeetingToDB(record);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
      });

      onMeetingSaved(record);
      setMeetingTitle("");
      setOfflineNotes("");
      setLiveTranscript("");
      setLiveSegments([]);
    } catch (err: any) {
      console.error("Erro ao salvar áudio MP3:", err);
      setErrorMessage(err.message || "Erro ao processar e salvar a gravação.");
    } finally {
      setIsProcessingMp3(false);
      setProcessingStatusText("");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Windows Capabilities */}
      <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
                Windows 10/11 Direct Audio Capture
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                Modo Contínuo & WakeLock
              </span>
              <span className="text-[11px] text-[#8E929E]">• Formato MP3 Nativo</span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Gravador Contínuo de Áudio & Extrator de Requisitos
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5 max-w-2xl">
              Grave o som contínuo do PC (Zoom, Teams, Meet, Discord, YouTube) em segundo plano, transcreva com IA e gere resumos automáticos dos pontos discutidos e especificações de requisitos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenWindowsGuide}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Dicas de Áudio PC</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-medium">{errorMessage}</p>
            <p className="text-[#8E929E] text-[11px]">
              Dica: Ao capturar o áudio do PC, selecione "Tela inteira" ou "Aba" e certifique-se de marcar a caixa "Compartilhar áudio do sistema".
            </p>
          </div>
        </div>
      )}

      {/* Main Recording Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Controls & Visualizer (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Source Selection Card */}
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Fonte de Áudio do Windows
              </label>
              <span className="text-[11px] text-[#6B7280] font-mono">MP3 • 192kbps • Contínuo</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* Dual Mix */}
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setSourceType("dual_mix")}
                className={`p-2.5 rounded-lg text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  sourceType === "dual_mix"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40"
                    : "bg-[#1C1F26] border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:bg-[#232730]"
                } ${isRecording ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1 rounded bg-blue-500/20 text-blue-400">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  {sourceType === "dual_mix" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EDEDED]">Mixagem Dupla</div>
                  <div className="text-[10px] text-[#8E929E]">PC + Microfone (Ideal)</div>
                </div>
              </button>

              {/* PC System Audio Only */}
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setSourceType("system")}
                className={`p-2.5 rounded-lg text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  sourceType === "system"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40"
                    : "bg-[#1C1F26] border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:bg-[#232730]"
                } ${isRecording ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  {sourceType === "system" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EDEDED]">Áudio do PC</div>
                  <div className="text-[10px] text-[#8E929E]">Zoom, Teams, Apps</div>
                </div>
              </button>

              {/* Mic Only */}
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setSourceType("mic")}
                className={`p-2.5 rounded-lg text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  sourceType === "mic"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40"
                    : "bg-[#1C1F26] border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:bg-[#232730]"
                } ${isRecording ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1 rounded bg-emerald-500/20 text-emerald-400">
                    <Mic className="w-3.5 h-3.5" />
                  </div>
                  {sourceType === "mic" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EDEDED]">Microfone</div>
                  <div className="text-[10px] text-[#8E929E]">Voz presencial</div>
                </div>
              </button>
            </div>

            {/* Mixer volume sliders for dual_mix */}
            {sourceType === "dual_mix" && (
              <div className="pt-2 border-t border-[#22252D] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#8E929E]">
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-indigo-400" /> Volume Áudio PC
                    </span>
                    <span className="font-mono">{Math.round(systemVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={systemVol}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSystemVol(val);
                      if (audioEngineRef.current) audioEngineRef.current.setSystemVolume(val);
                    }}
                    className="w-full accent-blue-500 h-1.5 bg-[#22252D] rounded-lg cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#8E929E]">
                    <span className="flex items-center gap-1">
                      <Mic className="w-3 h-3 text-emerald-400" /> Volume Microfone
                    </span>
                    <span className="font-mono">{Math.round(micVol * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={micVol}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setMicVol(val);
                      if (audioEngineRef.current) audioEngineRef.current.setMicVolume(val);
                    }}
                    className="w-full accent-blue-500 h-1.5 bg-[#22252D] rounded-lg cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Crucial Windows Capture Instructions Box */}
            {(sourceType === "system" || sourceType === "dual_mix") && !isRecording && (
              <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/25 text-xs text-[#C4C7D0] space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-blue-300 text-[11px]">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Como liberar a captura de som do Windows no Chrome/Edge:</span>
                </div>
                <ul className="text-[11px] space-y-1 text-[#9CA3AF] list-disc list-inside">
                  <li>
                    Na janelinha do navegador que abrir, escolha <strong className="text-white">"Tela inteira"</strong> ou a <strong className="text-white">"Aba"</strong> do Meet/Teams/YouTube.
                  </li>
                  <li>
                    <strong className="text-amber-300">OBRIGATÓRIO:</strong> Marque a caixinha <strong className="text-white">"Compartilhar áudio do sistema"</strong> (no canto inferior esquerdo).
                  </li>
                </ul>
              </div>
            )}

            {/* Meeting Title Input */}
            <div className="pt-1">
              <label className="block text-[11px] font-semibold text-[#C4C7D0] mb-1">
                Título ou Assunto da Reunião
              </label>
              <input
                type="text"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Ex: Alinhamento de Requisitos - Módulo Financeiro & Pix"
                disabled={isRecording}
                className="w-full bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none disabled:opacity-60"
              />
            </div>

            {/* Auto AI Summarization toggle */}
            <div className="pt-1 flex items-center justify-between border-t border-[#22252D]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoAiTranscribe}
                  onChange={(e) => setAutoAiTranscribe(e.target.checked)}
                  disabled={isRecording}
                  className="rounded border-[#2A2D35] bg-[#0E1015] text-blue-600 focus:ring-blue-500 accent-blue-600"
                />
                <span className="text-xs text-[#C4C7D0] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Transcrever & Gerar Resumo com IA automaticamente ao concluir
                </span>
              </label>
            </div>
          </div>

          {/* Audio Visualizer Stage */}
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider">
                  Osciloscópio & Espectro de Áudio
                </span>
                {isRecording && (
                  <span className="flex items-center gap-1 text-[10px] text-red-400 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    GRAVANDO EM SEGUNDO PLANO
                  </span>
                )}
              </div>
              <div className="font-mono text-base font-bold text-white tracking-wider">
                {recordingTime}
              </div>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-[#22252D]">
              <canvas ref={canvasRef} width={640} height={140} className="w-full h-32 block bg-[#0A0B0D]" />
            </div>

            {/* Main Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isProcessingMp3}
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition-all transform active:scale-98 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Iniciar Gravação Contínua (Alt + R)</span>
                </button>
              ) : (
                <div className="flex flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePauseToggle}
                    className={`px-3.5 py-2.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
                      isPaused
                        ? "bg-amber-500/20 border-amber-500/40 text-amber-300 hover:bg-amber-500/30"
                        : "bg-[#1C1F26] border-[#2A2D35] text-[#EDEDED] hover:bg-[#242830]"
                    }`}
                  >
                    {isPaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
                    <span>{isPaused ? "Retomar" : "Pausar"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStopRecording}
                    disabled={isProcessingMp3}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30 transition transform active:scale-98 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-white" />
                    <span>Concluir Gravação & Gerar MP3</span>
                  </button>
                </div>
              )}
            </div>

            {isProcessingMp3 && (
              <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs flex items-center justify-center gap-2.5 animate-pulse">
                <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
                <span className="font-semibold">{processingStatusText || "Processando áudio e IA..."}</span>
              </div>
            )}
          </div>

          {/* Quick Marker Timestamp Bar */}
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider flex items-center gap-1.5">
                <BookmarkPlus className="w-3.5 h-3.5 text-amber-400" />
                Marcação Rápida de Momentos-Chave
              </label>
              <span className="text-[11px] text-[#6B7280]">Atalho: Alt + M</span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleAddQuickMarker("Requisito Funcional Detectado", "requisito")}
                disabled={!isRecording}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <span>⚙️ + Requisito (RF)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddQuickMarker("Decisão de Arquitetura / Negócio", "decisao")}
                disabled={!isRecording}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <span>⚖️ + Decisão</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddQuickMarker("Tarefa / Ação Pendente", "tarefa")}
                disabled={!isRecording}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <span>✅ + Tarefa / Ação</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddQuickMarker("Dúvida / Ponto em Aberto", "duvida")}
                disabled={!isRecording}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <span>❓ + Dúvida</span>
              </button>
            </div>

            {/* Custom Marker Input */}
            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={markerLabel}
                onChange={(e) => setMarkerLabel(e.target.value)}
                placeholder="Ou digite uma nota rápida para o minuto atual..."
                disabled={!isRecording}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && markerLabel.trim()) {
                    handleAddQuickMarker(markerLabel, markerType);
                  }
                }}
                className="flex-1 bg-[#0E1015] border border-[#22252D] rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => markerLabel.trim() && handleAddQuickMarker(markerLabel, markerType)}
                disabled={!isRecording || !markerLabel.trim()}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] border border-[#2A2D35] disabled:opacity-50 cursor-pointer"
              >
                Adicionar
              </button>
            </div>

            {/* List of current markers */}
            {markers.length > 0 && (
              <div className="space-y-1 pt-1.5 max-h-32 overflow-y-auto pr-1">
                {markers.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between text-xs px-2.5 py-1 rounded bg-[#0E1015] border border-[#22252D] text-[#C4C7D0]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-blue-400 font-bold px-1 py-0.2 rounded bg-blue-500/10">
                        {m.timeFormatted}
                      </span>
                      <span className="text-xs">{m.label}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-[#8E929E]">
                      {m.type}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Live Transcription & Notes (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Live Transcript Stream */}
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-2.5 flex flex-col h-[320px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider">
                  Transcrição Contínua ao Vivo
                </span>
              </div>
              <span className="text-[10px] text-[#6B7280] font-mono">
                {liveTranscript.split(/\s+/).filter(Boolean).length} palavras
              </span>
            </div>

            <div className="flex-1 bg-[#0A0B0D] border border-[#22252D] rounded-lg p-3 overflow-y-auto text-xs leading-relaxed text-[#C4C7D0] font-sans space-y-2">
              {liveTranscript ? (
                <div className="space-y-1.5">
                  {liveSegments.map((s) => (
                    <div key={s.id} className="flex items-start gap-1.5">
                      <span className="font-mono text-[10px] text-blue-400 font-bold shrink-0">
                        [{s.timeFormatted}]
                      </span>
                      <p className="text-xs text-[#EDEDED]">{s.text}</p>
                    </div>
                  ))}
                  {!liveSegments.length && <p className="whitespace-pre-wrap">{liveTranscript}</p>}
                </div>
              ) : (
                <p className="text-[#6B7280] italic text-center pt-16 text-xs">
                  {isRecording
                    ? "Gravando áudio em segundo plano... Fale ou reproduza som no Windows para ver a transcrição em tempo real."
                    : "A transcrição em tempo real contínua será exibida aqui durante a gravação."}
                </p>
              )}

              {interimText && (
                <span className="text-blue-400 italic bg-blue-500/10 px-1 rounded animate-pulse">
                  {interimText}
                </span>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Quick Meeting Notepad & Tags */}
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Anotações Rápidas & Pauta
              </label>
              <span className="text-[10px] text-[#6B7280]">Salvo junto ao áudio</span>
            </div>

            <textarea
              value={offlineNotes}
              onChange={(e) => setOfflineNotes(e.target.value)}
              placeholder="Digite pontos da pauta, links, nomes de participantes ou observações rápidas..."
              rows={4}
              className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg p-2.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none focus:border-blue-500 resize-none"
            />

            <div>
              <label className="block text-[10px] text-[#8E929E] mb-1 font-semibold uppercase">Tags:</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: Requisitos, Sprint 14, Financeiro, Windows"
                className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-2.5 py-1 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
