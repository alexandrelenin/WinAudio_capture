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
  Settings,
  Layers,
  Users,
  Film,
  Video,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { AudioCaptureEngine } from "../utils/audioRecorder";
import {
  AudioSourceType,
  AudioMarker,
  MeetingRecord,
  TranscriptSegment,
  MeetingTemplateType,
  AISettings,
  RecordMediaType,
  VideoResolution,
} from "../types";
import { formatTime, formatBytes } from "../utils/audioEncoder";
import { saveMeetingToDB } from "../utils/db";
import { analyzeMeetingLocallyOffline } from "../utils/offlineAnalyzer";
import { MEETING_TEMPLATES } from "../utils/aiSettings";
import confetti from "canvas-confetti";

interface LiveRecorderPanelProps {
  onMeetingSaved: (meeting: MeetingRecord) => void;
  onOpenWindowsGuide: () => void;
  onOpenAISettings: () => void;
  aiSettings: AISettings;
  audioEngineRef: React.MutableRefObject<AudioCaptureEngine | null>;
  isRecording: boolean;
  setIsRecording: (rec: boolean) => void;
  recordingTime: string;
  setRecordingTime: (t: string) => void;
}

export const LiveRecorderPanel: React.FC<LiveRecorderPanelProps> = ({
  onMeetingSaved,
  onOpenWindowsGuide,
  onOpenAISettings,
  aiSettings,
  audioEngineRef,
  isRecording,
  setIsRecording,
  recordingTime,
  setRecordingTime,
}) => {
  // Check if getDisplayMedia is supported in the current context
  const isDisplayMediaSupported =
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getDisplayMedia === "function";

  const isInIframe = typeof window !== "undefined" && window.self !== window.top;

  // Recording mode: Audio only vs Screen Video + Audio
  const [recordTarget, setRecordTarget] = useState<RecordMediaType>("audio");
  const [videoResolution, setVideoResolution] = useState<VideoResolution>("1080p");
  const [videoFps, setVideoFps] = useState<number>(30);
  const [activeVisualizerTab, setActiveVisualizerTab] = useState<"video" | "spectrum">("video");

  const [sourceType, setSourceType] = useState<AudioSourceType>(
    isDisplayMediaSupported ? "dual_channels" : "mic"
  );
  const [selectedTemplate, setSelectedTemplate] = useState<MeetingTemplateType>(
    aiSettings.defaultTemplate || "general"
  );
  const [meetingTitle, setMeetingTitle] = useState<string>("");
  const [participantsInput, setParticipantsInput] = useState<string>("");
  const [closedCaptionsContext, setClosedCaptionsContext] = useState<string>("");
  const [showClosedCaptionsBox, setShowClosedCaptionsBox] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [markers, setMarkers] = useState<AudioMarker[]>([]);
  const [liveTranscript, setLiveTranscript] = useState<string>("");
  const [liveSegments, setLiveSegments] = useState<TranscriptSegment[]>([]);
  const [interimText, setInterimText] = useState<string>("");
  const [offlineNotes, setOfflineNotes] = useState<string>("");
  const [tagsInput, setTagsInput] = useState<string>("Reunião, Alinhamento, Ata");
  const [autoAiTranscribe, setAutoAiTranscribe] = useState<boolean>(
    aiSettings.autoProcessWithAiOnRecordEnd
  );
  const [enableLiveBrowserSpeech, setEnableLiveBrowserSpeech] = useState<boolean>(
    aiSettings.enableLiveBrowserSpeech
  );
  const [systemVol, setSystemVol] = useState<number>(1.0);
  const [micVol, setMicVol] = useState<number>(1.0);
  const [markerLabel, setMarkerLabel] = useState<string>("");
  const [markerType, setMarkerType] = useState<AudioMarker["type"]>("requisito");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessingMp3, setIsProcessingMp3] = useState<boolean>(false);
  const [processingStatusText, setProcessingStatusText] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveVideoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // Sync settings when modified from external modal
  useEffect(() => {
    setAutoAiTranscribe(aiSettings.autoProcessWithAiOnRecordEnd);
    setEnableLiveBrowserSpeech(aiSettings.enableLiveBrowserSpeech);
    if (!isRecording && aiSettings.defaultTemplate) {
      setSelectedTemplate(aiSettings.defaultTemplate);
    }
  }, [aiSettings, isRecording]);

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

  // Attach live screen video stream to preview element
  useEffect(() => {
    if (isRecording && recordTarget === "screen_video" && liveVideoPreviewRef.current && audioEngineRef.current) {
      const stream = audioEngineRef.current.getVideoStream();
      if (stream) {
        liveVideoPreviewRef.current.srcObject = stream;
        liveVideoPreviewRef.current.play().catch(console.error);
      }
    } else if (!isRecording && liveVideoPreviewRef.current) {
      liveVideoPreviewRef.current.srcObject = null;
    }
  }, [isRecording, recordTarget, activeVisualizerTab, audioEngineRef]);

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

      // Dark background gradient
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
        const { timeData, freqData } = audioEngineRef.current.getAudioLevels();

        // 1. Draw Frequency Bars
        const barWidth = (width / freqData.length) * 2.2;
        let x = 0;
        for (let i = 0; i < freqData.length / 2; i++) {
          const barHeight = (freqData[i] / 255) * (height * 0.4);

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
        waveGrad.addColorStop(0, "#10b981");
        waveGrad.addColorStop(0.5, "#38bdf8");
        waveGrad.addColorStop(1, "#818cf8");
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
      } else {
        // Idle ambient line
        ctx.strokeStyle = "rgba(75, 85, 99, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecording, isPaused, audioEngineRef]);

  // Auto-scroll transcript window
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveTranscript, liveSegments, interimText]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      // Alt + R -> Start / Stop
      if (e.altKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        if (!isRecording) {
          handleStartRecording();
        } else {
          handleStopRecording();
        }
      }

      // Alt + P -> Pause / Resume
      if (e.altKey && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
        if (isRecording) {
          handlePauseToggle();
        }
      }

      // Alt + M -> Add quick marker
      if (e.altKey && (e.key === "m" || e.key === "M")) {
        e.preventDefault();
        if (isRecording) {
          handleAddQuickMarker("Ponto-chave importante");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRecording, meetingTitle, sourceType, recordTarget, autoAiTranscribe]);

  const handleStartRecordingWith = async (sourceOverride?: AudioSourceType, targetOverride?: RecordMediaType) => {
    const src = sourceOverride || sourceType;
    const tgt = targetOverride || recordTarget;
    if (sourceOverride) setSourceType(sourceOverride);
    if (targetOverride) setRecordTarget(targetOverride);

    setErrorMessage(null);
    try {
      if (!meetingTitle.trim()) {
        const tmplObj = MEETING_TEMPLATES.find((t) => t.id === selectedTemplate);
        const typeLabel = tgt === "screen_video" ? "Gravação de Tela" : "Reunião";
        const defaultTitle = `${tmplObj?.label || typeLabel} - ${new Date().toLocaleDateString("pt-BR")} (${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })})`;
        setMeetingTitle(defaultTitle);
      }

      if (!audioEngineRef.current) {
        audioEngineRef.current = new AudioCaptureEngine();
      }

      audioEngineRef.current.setSystemVolume(systemVol);
      audioEngineRef.current.setMicVolume(micVol);

      const participantsList = participantsInput
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      const hostLabel = participantsList.length > 0 ? participantsList[0] : "Você (Microfone)";

      await audioEngineRef.current.startRecording(
        src,
        enableLiveBrowserSpeech
          ? (chunk, isFinal, seg) => {
              if (isFinal) {
                setLiveTranscript((prev) => (prev ? prev + " " : "") + chunk);
                setInterimText("");
                if (seg) {
                  setLiveSegments((prev) => [...prev, seg]);
                }
              } else {
                setInterimText(chunk);
              }
            }
          : undefined,
        hostLabel,
        tgt,
        { resolution: videoResolution, fps: videoFps }
      );

      setIsRecording(true);
      setIsPaused(false);
      setMarkers([]);
      setLiveTranscript("");
      setLiveSegments([]);
      setInterimText("");
      if (tgt === "screen_video") {
        setActiveVisualizerTab("video");
      }
    } catch (err: any) {
      console.error("Erro ao iniciar gravação:", err);
      setErrorMessage(err.message || "Não foi possível iniciar a captura de áudio/tela.");
    }
  };

  const handleStartRecording = () => handleStartRecordingWith();

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
    setProcessingStatusText(
      recordTarget === "screen_video"
        ? "Processando vídeo da tela e codificando áudio MP3 (192kbps)..."
        : "Codificando áudio diretamente em formato MP3 (192kbps)..."
    );
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
      let finalSegments: TranscriptSegment[] =
        result.transcriptSegments && result.transcriptSegments.length > 0
          ? result.transcriptSegments
          : liveSegments;

      // Base offline analysis
      let initialAnalysis = analyzeMeetingLocallyOffline(
        title,
        finalTranscript,
        offlineNotes,
        result.markers
      );

      const participantsList = participantsInput
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      // Trigger automatic AI transcription & summarization according to template if enabled
      if (autoAiTranscribe) {
        const provName = aiSettings.provider.replace("_", " ").toUpperCase();
        setProcessingStatusText(`Processando com IA (${provName} • ${aiSettings.model}): Transcrição com Diarização & Ata...`);
        try {
          // Convert audio blob to base64 if audio exists (< 30MB)
          let audioBase64: string | undefined;
          let mimeType: string = "audio/mp3";

          if (result.mp3Blob && result.mp3Blob.size > 0 && result.mp3Blob.size < 28 * 1024 * 1024) {
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

          const res = await fetch("/api/analyze-meeting", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              meetingTitle: title,
              audioBase64,
              mimeType,
              transcript: finalTranscript,
              participants: participantsList,
              sourceType,
              offlineNotes,
              closedCaptionsContext: closedCaptionsContext.trim() || undefined,
              tags,
              duration: formatTime(result.duration),
              template: selectedTemplate,
              aiSettings,
            }),
          });

          if (res.ok) {
            const resJson = await res.json();
            const aiData = resJson.data || resJson;

            if (aiData.transcription) {
              finalTranscript = aiData.transcription;
            }
            if (aiData.transcriptSegments && aiData.transcriptSegments.length > 0) {
              finalSegments = aiData.transcriptSegments;
            }

            initialAnalysis = {
              ...initialAnalysis,
              mode: "ai",
              template: selectedTemplate,
              participants: aiData.participants || participantsList,
              speakerStats: aiData.speakerStats,
              executiveSummary: aiData.executiveSummary || aiData.conciseSummary || initialAnalysis.executiveSummary,
              conciseSummary: aiData.conciseSummary || aiData.executiveSummary || initialAnalysis.conciseSummary,
              formalMinutes: aiData.formalMinutes,
              keyPoints: aiData.keyDiscussionPoints || aiData.keyPoints || initialAnalysis.keyPoints,
              keyDiscussionPoints: aiData.keyDiscussionPoints || initialAnalysis.keyDiscussionPoints,
              decisions: aiData.decisions || initialAnalysis.decisions,
              actionItems: aiData.actionItems || initialAnalysis.actionItems,
              functionalRequirements: aiData.functionalRequirements || initialAnalysis.functionalRequirements,
              nonFunctionalRequirements: aiData.nonFunctionalRequirements || initialAnalysis.nonFunctionalRequirements,
              businessRules: aiData.businessRules || initialAnalysis.businessRules,
              userStories: aiData.userStories || initialAnalysis.userStories,
              studyGuide: aiData.studyGuide || initialAnalysis.studyGuide,
              ideas: aiData.ideas,
              oneOnOne: aiData.oneOnOne,
              salesInsights: aiData.salesInsights,
            };
          }
        } catch (aiErr) {
          console.warn("AI Auto-analysis fallback to local heuristic:", aiErr);
        }
      }

      const isVideoRec = result.mediaType === "video" && Boolean(result.videoBlob);

      const record: MeetingRecord = {
        id: `meet-${Date.now()}`,
        title,
        createdAt: new Date().toISOString(),
        duration: result.duration,
        durationFormatted: formatTime(result.duration),
        sourceType,
        mediaType: isVideoRec ? "video" : "audio",
        audioBlob: result.mp3Blob,
        videoBlob: result.videoBlob,
        videoResolution: result.videoResolution,
        videoFps: result.videoFps,
        format: isVideoRec ? "webm" : "mp3",
        fileSizeFormatted: isVideoRec && result.videoBlob
          ? formatBytes(result.videoBlob.size)
          : formatBytes(result.mp3Blob.size),
        transcript: finalTranscript,
        transcriptSegments: finalSegments,
        participants: participantsList.length > 0 ? participantsList : undefined,
        offlineNotes,
        closedCaptionsContext: closedCaptionsContext.trim() || undefined,
        markers: result.markers,
        tags,
        template: selectedTemplate,
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
      console.error("Erro ao salvar gravação:", err);
      setErrorMessage(err.message || "Erro ao processar e salvar a gravação.");
    } finally {
      setIsProcessingMp3(false);
      setProcessingStatusText("");
    }
  };

  const currentTmpl = MEETING_TEMPLATES.find((t) => t.id === selectedTemplate);

  return (
    <div className="space-y-4">
      {/* Top Banner with Windows Capabilities & Active AI Engine */}
      <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
                Gravador de Tela & Áudio HD
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" />
                Gravação em Segundo Plano
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/15 text-purple-400 border border-purple-500/30 font-mono">
                <Sparkles className="w-3 h-3" />
                IA: {aiSettings.model}
              </span>
            </div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Gravador de Tela & Reuniões com Atas e Requisitos por IA
            </h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5 max-w-2xl">
              Grave apresentações, slides, chamadas do Google Meet, Zoom, Teams ou o som do PC. Obtenha vídeo da tela, MP3, transcrições e atas executivas estruturadas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isInIframe && (
              <a
                href={typeof window !== "undefined" ? window.location.href : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Abre o app em uma aba dedicada para suporte completo a gravação de tela e áudio do PC"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>Abrir em Nova Aba</span>
              </a>
            )}
            <button
              onClick={onOpenAISettings}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-amber-400" />
              <span>Configurar IA</span>
            </button>
            <button
              onClick={onOpenWindowsGuide}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-blue-400" />
              <span>Dicas de Captura</span>
            </button>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold text-red-200">{errorMessage}</p>
              <p className="text-[#8E929E] text-[11px]">
                {isInIframe
                  ? "Dica: Em visualizadores embutidos (iFrame), use 'Apenas Microfone' ou abra em nova aba para capturar tela e áudio interno do Windows."
                  : "Dica: Ao selecionar Gravar Tela ou Áudio do PC, uma janela do navegador abrirá: selecione a Tela ou Guia e clique no botão azul 'Compartilhar'."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
            {isInIframe && (
              <a
                href={typeof window !== "undefined" ? window.location.href : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir em Nova Aba</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                setRecordTarget("audio");
                setSourceType("mic");
                setErrorMessage(null);
                setTimeout(() => handleStartRecordingWith("mic", "audio"), 50);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Gravar com Apenas Microfone</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                handleStartRecording();
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#2A2D35] text-[#EDEDED] border border-[#2A2D35] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Tentar Novamente</span>
            </button>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="px-2.5 py-1.5 rounded-lg text-xs text-[#9CA3AF] hover:text-white bg-[#1C1F26] border border-[#2A2D35] cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* TOP ROW: Monitor de Gravação & Transcrição Contínua ao Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* TOP LEFT (lg:col-span-6): Card do Monitor de Gravação (Inicia e Para a Gravação) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-3.5">
            {/* Monitor Header & Status */}
            <div className="flex items-center justify-between border-b border-[#22252D] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                  {recordTarget === "screen_video" ? <Video className="w-4 h-4 text-emerald-400" /> : <Mic className="w-4 h-4 text-blue-400" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-[#EDEDED] uppercase tracking-wider block">
                    {recordTarget === "screen_video" ? "Monitor de Gravação de Tela & Áudio" : "Monitor de Gravação de Áudio"}
                  </span>
                  <span className="text-[10px] text-[#8E929E]">
                    {recordTarget === "screen_video" ? "Captura tela cheia / guia + áudio estereofônico" : "Codificação direta em MP3 192kbps"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isRecording ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/15 text-[11px] text-red-400 font-mono font-bold border border-red-500/30">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    REC {recordingTime}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono text-[#8E929E] bg-[#1C1F26] border border-[#2A2D35]">
                    {recordingTime}
                  </span>
                )}
              </div>
            </div>

            {/* Modalidade de Gravação (Áudio MP3 vs Tela HD + Áudio) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-blue-400" />
                  Modalidade de Captura
                </label>
                <span className="text-[10px] text-[#6B7280]">
                  {recordTarget === "screen_video" ? "Gera Vídeo HD + Áudio MP3" : "Gera Arquivo MP3 Leve"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Option A: Pure Audio (MP3) */}
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setRecordTarget("audio")}
                  className={`p-2.5 rounded-lg text-left border transition-all flex flex-col justify-between gap-1 ${
                    recordTarget === "audio"
                      ? "bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40"
                      : "bg-[#1C1F26] border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:bg-[#232730]"
                  } ${isRecording ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-xs font-bold text-[#EDEDED]">Apenas Áudio</span>
                    </div>
                    {recordTarget === "audio" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <div className="text-[10px] text-[#8E929E]">MP3 192kbps • Leve para voz e atas</div>
                </button>

                {/* Option B: Screen Video + Audio */}
                <button
                  type="button"
                  disabled={isRecording}
                  onClick={() => setRecordTarget("screen_video")}
                  className={`p-2.5 rounded-lg text-left border transition-all flex flex-col justify-between gap-1 ${
                    recordTarget === "screen_video"
                      ? "bg-emerald-600/20 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/40"
                      : "bg-[#1C1F26] border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:bg-[#232730]"
                  } ${isRecording ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-bold text-[#EDEDED]">Gravar Tela + Áudio</span>
                    </div>
                    {recordTarget === "screen_video" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <div className="text-[10px] text-[#8E929E]">Vídeo HD (WebM/MP4) + MP3</div>
                </button>
              </div>

              {/* If Screen Video selected, show resolution and FPS options */}
              {recordTarget === "screen_video" && (
                <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] text-[#8E929E] font-semibold mb-1">Resolução do Vídeo:</label>
                    <select
                      value={videoResolution}
                      onChange={(e) => setVideoResolution(e.target.value as VideoResolution)}
                      disabled={isRecording}
                      className="w-full bg-[#0E1015] border border-[#2A2D35] rounded-lg px-2.5 py-1 text-xs text-[#EDEDED] focus:outline-none focus:border-emerald-500"
                    >
                      <option value="1080p">1080p (Full HD - Nítido para texto)</option>
                      <option value="720p">720p (HD - Mais leve e fluido)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-[#8E929E] font-semibold mb-1">Taxa de Quadros (FPS):</label>
                    <select
                      value={videoFps}
                      onChange={(e) => setVideoFps(parseInt(e.target.value))}
                      disabled={isRecording}
                      className="w-full bg-[#0E1015] border border-[#2A2D35] rounded-lg px-2.5 py-1 text-xs text-[#EDEDED] focus:outline-none focus:border-emerald-500"
                    >
                      <option value="30">30 FPS (Recomendado para reuniões)</option>
                      <option value="60">60 FPS (Ultra suave)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Visualizer Tabs when Screen recording */}
            {recordTarget === "screen_video" && isRecording && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveVisualizerTab("video")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                    activeVisualizerTab === "video"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      : "bg-[#1C1F26] text-[#8E929E] hover:text-white"
                  }`}
                >
                  <Film className="w-3 h-3 text-emerald-400" />
                  <span>Monitor da Tela Gravada</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveVisualizerTab("spectrum")}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                    activeVisualizerTab === "spectrum"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                      : "bg-[#1C1F26] text-[#8E929E] hover:text-white"
                  }`}
                >
                  <Sliders className="w-3 h-3 text-blue-400" />
                  <span>Espectro de Frequências</span>
                </button>
              </div>
            )}

            {/* Live Video Monitor or Audio Oscilloscope */}
            {recordTarget === "screen_video" && isRecording && activeVisualizerTab === "video" ? (
              <div className="relative rounded-lg overflow-hidden border border-[#22252D] bg-black aspect-video flex items-center justify-center max-h-48">
                <video
                  ref={liveVideoPreviewRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  TELA CAPTURADA • {videoResolution} • {videoFps}fps
                </div>
              </div>
            ) : (
              <div className="relative rounded-lg overflow-hidden border border-[#22252D]">
                <canvas ref={canvasRef} width={640} height={130} className="w-full h-28 block bg-[#0A0B0D]" />
              </div>
            )}

            {/* Main Action Bar (Iniciar, Pausar, Parar Gravação) */}
            <div className="pt-1">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={handleStartRecording}
                  disabled={isProcessingMp3}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-xs font-bold text-white shadow-md transition-all transform active:scale-98 cursor-pointer ${
                    recordTarget === "screen_video"
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                      : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/30"
                  }`}
                >
                  {recordTarget === "screen_video" ? (
                    <>
                      <Video className="w-4 h-4 text-white shrink-0" />
                      <span>Iniciar Gravação de Tela + Áudio (Alt + R)</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4 text-white shrink-0" />
                      <span>Iniciar Gravação Contínua de Áudio (Alt + R)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePauseToggle}
                    className={`px-4 py-2.5 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
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
                    <span>
                      {recordTarget === "screen_video"
                        ? "Concluir Gravação & Gerar Vídeo + MP3"
                        : "Concluir Gravação & Gerar MP3"}
                    </span>
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
        </div>

        {/* TOP RIGHT (lg:col-span-6): Card da Transcrição Contínua ao Vivo */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-2.5 flex flex-col h-full min-h-[380px]">
            <div className="flex items-center justify-between border-b border-[#22252D] pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
                  <FileText className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#EDEDED] uppercase tracking-wider block">
                    Transcrição Contínua ao Vivo
                  </span>
                  <span className="text-[10px] text-[#8E929E]">
                    {enableLiveBrowserSpeech ? "Web Speech nativo (0 tokens de IA)" : "Modo gravação pura em segundo plano"}
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-[#6B7280] font-mono px-2 py-0.5 rounded bg-[#1C1F26] border border-[#2A2D35]">
                {enableLiveBrowserSpeech
                  ? `${liveTranscript.split(/\s+/).filter(Boolean).length} palavras`
                  : "Desativado"}
              </span>
            </div>

            <div className="flex-1 bg-[#0A0B0D] border border-[#22252D] rounded-lg p-3 overflow-y-auto text-xs leading-relaxed text-[#C4C7D0] font-sans space-y-2 max-h-[310px]">
              {!enableLiveBrowserSpeech ? (
                <div className="text-center pt-16 pb-8 space-y-2">
                  <div className="w-9 h-9 mx-auto rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-[#EDEDED] font-semibold">
                    Transcrição ao Vivo desativada
                  </p>
                  <p className="text-[11px] text-[#8E929E] max-w-xs mx-auto">
                    A gravação está sendo realizada em segundo plano com fidelidade cristalina. A transcrição completa e a ata executiva serão geradas pelo modelo de IA ({aiSettings.model}) quando você clicar em concluir.
                  </p>
                </div>
              ) : liveTranscript ? (
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
                <p className="text-[#6B7280] italic text-center pt-20 text-xs">
                  {isRecording
                    ? "Gravando em segundo plano... Fale ou reproduza som no Windows para ver a transcrição em tempo real."
                    : "A transcrição em tempo real contínua será exibida aqui durante a gravação."}
                </p>
              )}

              {interimText && enableLiveBrowserSpeech && (
                <span className="text-blue-400 italic bg-blue-500/10 px-1 rounded animate-pulse">
                  {interimText}
                </span>
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Configurações de Áudio/Reunião & Marcação Rápida (Abaixo da Transcrição) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* BOTTOM LEFT (lg:col-span-6): Fontes de Áudio, Volumes, Título & Template */}
        <div className="lg:col-span-6 space-y-4">
          {/* Audio Source Selection Card */}
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-blue-400" />
                Fontes de Áudio & Microfone
              </label>
              <span className="text-[11px] text-[#6B7280] font-mono">Diarização Estéreo L / R</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Dual Channels (Stereo Separation: Left=Mic, Right=Meet) */}
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setSourceType("dual_channels")}
                className={`p-3 rounded-lg text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  sourceType === "dual_channels"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40"
                    : "bg-[#1C1F26] border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:bg-[#232730]"
                } ${isRecording ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="p-1 rounded bg-blue-500/20 text-blue-400">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Diarização 100%
                    </span>
                  </div>
                  {sourceType === "dual_channels" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EDEDED]">Separação de Canais (L / R)</div>
                  <div className="text-[10px] text-[#8E929E]">Canal E = Seu Microfone • Canal D = Google Meet</div>
                </div>
              </button>

              {/* Dual Mix */}
              <button
                type="button"
                disabled={isRecording}
                onClick={() => setSourceType("dual_mix")}
                className={`p-3 rounded-lg text-left border transition-all flex flex-col justify-between gap-1.5 ${
                  sourceType === "dual_mix"
                    ? "bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40"
                    : "bg-[#1C1F26] border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:bg-[#232730]"
                } ${isRecording ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between">
                  <div className="p-1 rounded bg-indigo-500/20 text-indigo-400">
                    <Sliders className="w-3.5 h-3.5" />
                  </div>
                  {sourceType === "dual_mix" && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#EDEDED]">Mixagem Combinada</div>
                  <div className="text-[10px] text-[#8E929E]">PC + Microfone mesclados juntos</div>
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
                  <div className="text-xs font-bold text-[#EDEDED]">Apenas Áudio do PC</div>
                  <div className="text-[10px] text-[#8E929E]">Zoom, Teams, Meet</div>
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
                  <div className="text-xs font-bold text-[#EDEDED]">Apenas Microfone</div>
                  <div className="text-[10px] text-[#8E929E]">Voz presencial direta</div>
                </div>
              </button>
            </div>

            {/* Mixer volume sliders */}
            {(sourceType === "dual_channels" || sourceType === "dual_mix") && (
              <div className="pt-2 border-t border-[#22252D] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#8E929E]">
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3 h-3 text-indigo-400" /> Volume Áudio PC / Meet
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
                      <Mic className="w-3 h-3 text-emerald-400" /> Volume Microfone Local
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

            {/* Meeting Title & Participants Input */}
            <div className="pt-1 space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#C4C7D0] mb-1">
                  Título ou Assunto da Reunião
                </label>
                <input
                  type="text"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  placeholder={`Ex: ${currentTmpl?.label} - Alinhamento de Produto`}
                  disabled={isRecording}
                  className="w-full bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#C4C7D0] flex items-center gap-1">
                    <Users className="w-3 h-3 text-blue-400" />
                    Participantes da Reunião (Identificação / Roster)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-medium">Melhora a Diarização da IA</span>
                </div>
                <input
                  type="text"
                  value={participantsInput}
                  onChange={(e) => setParticipantsInput(e.target.value)}
                  placeholder="Ex: Alexandre (Apresentador), Beatriz (Tech Lead), Carlos (PO)"
                  disabled={isRecording}
                  className="w-full bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none disabled:opacity-60"
                />
              </div>
            </div>

            {/* Template Selector Card */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Template & Objetivo da Reunião
                </label>
                <span className="text-[11px] text-[#6B7280]">Adapta o resumo da IA</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MEETING_TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      disabled={isRecording}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`p-2.5 rounded-lg text-left border transition-all flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "bg-blue-600/20 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/40"
                          : "bg-[#1C1F26] border-[#2A2D35] text-[#9CA3AF] hover:text-white hover:bg-[#232730]"
                      } ${isRecording ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-base">{tmpl.icon}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#EDEDED] truncate">{tmpl.shortLabel}</div>
                        <div className="text-[10px] text-[#8E929E] line-clamp-1">{tmpl.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Collapsible: Google Meet Closed Captions / Subtitles Context */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowClosedCaptionsBox(!showClosedCaptionsBox)}
                className="text-[11px] text-[#9CA3AF] hover:text-[#EDEDED] flex items-center gap-1 font-medium transition cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{showClosedCaptionsBox ? "Ocultar Legendas do Meet / CC" : "+ Inserir Legendas do Google Meet / Closed Captions (Opcional)"}</span>
              </button>

              {showClosedCaptionsBox && (
                <div className="mt-2 space-y-1">
                  <textarea
                    value={closedCaptionsContext}
                    onChange={(e) => setClosedCaptionsContext(e.target.value)}
                    placeholder="Cole aqui transcrições geradas pelas legendas do Google Meet, Zoom ou extensões para calibrar a precisão dos nomes e termos técnicos..."
                    rows={3}
                    className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg p-2.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none focus:border-blue-500 resize-none font-mono text-[11px]"
                  />
                </div>
              )}
            </div>

            {/* Toggles: Auto AI Summarization & Live Browser Speech */}
            <div className="pt-2 border-t border-[#22252D] space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoAiTranscribe}
                    onChange={(e) => setAutoAiTranscribe(e.target.checked)}
                    disabled={isRecording}
                    className="rounded border-[#2A2D35] bg-[#0E1015] text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-[#C4C7D0] font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Processar com IA ({aiSettings.model}) ao concluir com Diarização
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableLiveBrowserSpeech}
                    onChange={(e) => setEnableLiveBrowserSpeech(e.target.checked)}
                    disabled={isRecording}
                    className="rounded border-[#2A2D35] bg-[#0E1015] text-blue-600 focus:ring-blue-500 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-xs text-[#C4C7D0] flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    Transcrição Contínua ao Vivo (Web Speech nativo - 0 tokens)
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM RIGHT (lg:col-span-6): Card Marcação Rápida de Momentos-Chave (Abaixo da Transcrição) + Anotações */}
        <div className="lg:col-span-6 space-y-4">
          {/* Card Marcação Rápida de Momentos-Chave */}
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
                onClick={() => handleAddQuickMarker("Ponto-Chave / Destaque", "requisito")}
                disabled={!isRecording}
                className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 transition disabled:opacity-50 flex items-center gap-1 cursor-pointer"
              >
                <span>⭐ + Ponto-Chave</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddQuickMarker("Decisão Firmada", "decisao")}
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
                    <span className="text-[10px] uppercase font-bold text-[#8E929E]">{m.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Meeting Notepad & Tags */}
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-[#C4C7D0] uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                Anotações Rápidas & Pauta
              </label>
              <span className="text-[10px] text-[#6B7280]">Salvo com a gravação</span>
            </div>

            <textarea
              value={offlineNotes}
              onChange={(e) => setOfflineNotes(e.target.value)}
              placeholder="Digite tópicos da pauta, participantes ou observações rápidas..."
              rows={4}
              className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg p-2.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none focus:border-blue-500 resize-none"
            />

            <div>
              <label className="block text-[10px] text-[#8E929E] mb-1 font-semibold uppercase">Tags:</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Ex: Reunião, Diretoria, Financeiro, Tela, Demo"
                className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-2.5 py-1 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
