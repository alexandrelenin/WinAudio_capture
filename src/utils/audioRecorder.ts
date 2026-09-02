import { AudioSourceType, AudioMarker, TranscriptSegment, RecordMediaType, VideoResolution } from "../types";
import { convertAudioBufferToMp3, convertBlobToAudioBuffer, formatTime } from "./audioEncoder";
import { LiveSpeechRecognizer } from "./speechRecognition";

export interface AudioLevels {
  overallLevel: number;
  micLevel: number;
  systemLevel: number;
  timeData: Uint8Array;
  freqData: Uint8Array;
  micFreqData?: Uint8Array;
  systemFreqData?: Uint8Array;
}

export interface StopRecordingResult {
  mp3Blob: Blob;
  videoBlob?: Blob;
  mediaType: "audio" | "video";
  videoResolution?: string;
  videoFps?: number;
  duration: number;
  markers: AudioMarker[];
  liveTranscript: string;
  transcriptSegments: TranscriptSegment[];
}

export class AudioCaptureEngine {
  private audioCtx: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioMediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private audioRecordedChunks: Blob[] = [];
  private systemStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private mixedStream: MediaStream | null = null;
  private combinedVideoStream: MediaStream | null = null;

  private analyser: AnalyserNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private systemAnalyser: AnalyserNode | null = null;

  private systemGainNode: GainNode | null = null;
  private micGainNode: GainNode | null = null;
  private channelMerger: ChannelMergerNode | null = null;

  private startTime: number = 0;
  private pausedTime: number = 0;
  private totalPausedDuration: number = 0;
  private isRecording: boolean = false;
  private isPaused: boolean = false;
  private currentSourceType: AudioSourceType = "dual_channels";
  private recordTarget: RecordMediaType = "audio";
  private videoResolution: VideoResolution = "1080p";
  private videoFps: number = 30;

  private speechRecognizer: LiveSpeechRecognizer | null = null;
  private markers: AudioMarker[] = [];
  private liveTranscript: string = "";
  private transcriptSegments: TranscriptSegment[] = [];

  private wakeLockSentinel: any = null;

  public systemVolume: number = 1.0;
  public micVolume: number = 1.0;
  public isContinuousMode: boolean = true;
  public hostName: string = "Você (Microfone)";

  constructor() {
    this.speechRecognizer = new LiveSpeechRecognizer("pt-BR");
  }

  // Request WakeLock to prevent OS/Browser from sleeping in the background during long recording
  private async acquireWakeLock() {
    try {
      if ("wakeLock" in navigator && (navigator as any).wakeLock?.request) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        this.wakeLockSentinel.addEventListener("release", () => {
          this.wakeLockSentinel = null;
        });
      }
    } catch (e) {
      console.warn("Wake Lock not supported or permission denied:", e);
    }
  }

  private releaseWakeLock() {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch (e) {}
      this.wakeLockSentinel = null;
    }
  }

  public getVideoStream(): MediaStream | null {
    return this.systemStream;
  }

  public getRecordTarget(): RecordMediaType {
    return this.recordTarget;
  }

  public async startRecording(
    sourceType: AudioSourceType,
    onTranscriptChunk?: (text: string, isFinal: boolean, segment?: TranscriptSegment) => void,
    hostLabel?: string,
    recordTarget: RecordMediaType = "audio",
    videoOptions?: { resolution?: VideoResolution; fps?: number }
  ): Promise<void> {
    this.recordedChunks = [];
    this.audioRecordedChunks = [];
    this.markers = [];
    this.liveTranscript = "";
    this.transcriptSegments = [];
    this.totalPausedDuration = 0;
    this.isPaused = false;
    this.currentSourceType = sourceType;
    this.recordTarget = recordTarget;
    if (videoOptions?.resolution) this.videoResolution = videoOptions.resolution;
    if (videoOptions?.fps) this.videoFps = videoOptions.fps;
    if (hostLabel) this.hostName = hostLabel;

    // Acquire WakeLock for continuous background recording
    await this.acquireWakeLock();

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass({ latencyHint: "interactive" });

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    // Main mixed analyser
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    // Separate channel analysers for discrete VU meters
    this.micAnalyser = this.audioCtx.createAnalyser();
    this.micAnalyser.fftSize = 128;
    this.micAnalyser.smoothingTimeConstant = 0.7;

    this.systemAnalyser = this.audioCtx.createAnalyser();
    this.systemAnalyser.fftSize = 128;
    this.systemAnalyser.smoothingTimeConstant = 0.7;

    const destination = this.audioCtx.createMediaStreamDestination();

    const needsSystemAudio = sourceType === "system" || sourceType === "dual_mix" || sourceType === "dual_channels";
    const needsMic = sourceType === "mic" || sourceType === "dual_mix" || sourceType === "dual_channels";
    const isScreenRecording = recordTarget === "screen_video";

    // 1. Capture Screen Video and/or System Audio
    if (needsSystemAudio || isScreenRecording) {
      try {
        const getDisplayMediaFn =
          typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function"
            ? navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices)
            : typeof (navigator as any)?.getDisplayMedia === "function"
            ? (navigator as any).getDisplayMedia.bind(navigator)
            : null;

        if (!getDisplayMediaFn) {
          throw new Error(
            "A API de captura de tela/áudio (getDisplayMedia) não está habilitada no iframe embutido ou neste navegador. Para gravar a tela ou áudio interno do PC, abra a aplicação em uma nova aba do navegador (botão no canto superior) ou utilize o modo 'Apenas Microfone'."
          );
        }

        const videoConstraints: any = isScreenRecording
          ? {
              displaySurface: "monitor",
              frameRate: { ideal: this.videoFps, max: 60 },
              width: this.videoResolution === "1080p" ? { ideal: 1920 } : this.videoResolution === "720p" ? { ideal: 1280 } : undefined,
              height: this.videoResolution === "1080p" ? { ideal: 1080 } : this.videoResolution === "720p" ? { ideal: 720 } : undefined,
            }
          : { displaySurface: "monitor" };

        const displayOptions: any = {
          video: videoConstraints,
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            suppressLocalAudioPlayback: false,
          },
          systemAudio: "include",
          surfaceSwitching: "include",
          selfBrowserSurface: "include",
        };

        this.systemStream = await getDisplayMediaFn(displayOptions);
        const audioTracks = this.systemStream.getAudioTracks();
        const videoTracks = this.systemStream.getVideoTracks();

        if (needsSystemAudio && audioTracks.length === 0) {
          if (sourceType === "system" && !isScreenRecording) {
            this.cleanupStreams();
            this.releaseWakeLock();
            throw new Error(
              "Nenhuma faixa de áudio do sistema foi capturada. No Windows (Chrome/Edge), selecione a aba 'Tela Inteira' ou 'Guia' e marque a caixinha 'Compartilhar áudio do sistema' no canto inferior esquerdo da janela de seleção."
            );
          } else {
            console.warn("No system audio track captured; continuing with video/microphone.");
          }
        }

        if (audioTracks.length > 0) {
          const systemSource = this.audioCtx.createMediaStreamSource(this.systemStream);
          this.systemGainNode = this.audioCtx.createGain();
          this.systemGainNode.gain.value = this.systemVolume;
          systemSource.connect(this.systemGainNode);
          this.systemGainNode.connect(this.systemAnalyser);

          audioTracks[0].onended = () => {
            console.log("System audio track ended by user.");
          };
        }

        if (videoTracks.length > 0) {
          videoTracks[0].onended = () => {
            console.log("Screen sharing track ended by user.");
          };
        }
      } catch (err: any) {
        if (sourceType === "system" || isScreenRecording || sourceType === "dual_channels" || sourceType === "dual_mix") {
          this.cleanupStreams();
          this.releaseWakeLock();
          if (err.name === "NotAllowedError" || err.message?.includes("Permission denied") || err.message?.includes("cancel")) {
            throw new Error(
              isScreenRecording
                ? "Permissão de captura de tela cancelada. Na janela que o navegador abrir, selecione a tela/guia e clique no botão azul 'Compartilhar'."
                : "Permissão de captura de áudio do sistema cancelada. Ao abrir a janela, escolha a tela ou guia e ative 'Compartilhar áudio do sistema'. Ou mude a fonte para 'Apenas Microfone' se desejar gravar apenas sua voz."
            );
          }
          throw err;
        } else {
          console.warn("System audio capture skipped, falling back to mic:", err);
        }
      }
    }

    // 2. Capture Local Microphone
    if (needsMic) {
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        const micSource = this.audioCtx.createMediaStreamSource(this.micStream);
        this.micGainNode = this.audioCtx.createGain();
        this.micGainNode.gain.value = this.micVolume;
        micSource.connect(this.micGainNode);
        this.micGainNode.connect(this.micAnalyser);
      } catch (err: any) {
        this.cleanupStreams();
        this.releaseWakeLock();
        if (err.name === "NotAllowedError") {
          throw new Error("Acesso ao microfone foi negado. Permita o uso do microfone no Windows/Navegador.");
        }
        throw err;
      }
    }

    // 3. Routing & Channel Separation Strategy
    if (sourceType === "dual_channels" && this.micGainNode && this.systemGainNode) {
      // Discrete Stereo Channel Separation:
      // Left Channel (0) = Microphone (Host)
      // Right Channel (1) = Google Meet / System Audio (Remote Participants)
      this.channelMerger = this.audioCtx.createChannelMerger(2);
      this.micGainNode.connect(this.channelMerger, 0, 0); // Route Mic to Left (0)
      this.systemGainNode.connect(this.channelMerger, 0, 1); // Route System to Right (1)

      this.channelMerger.connect(destination);
      this.channelMerger.connect(this.analyser);
    } else {
      // Standard mix / single source
      if (this.micGainNode) {
        this.micGainNode.connect(destination);
        this.micGainNode.connect(this.analyser);
      }
      if (this.systemGainNode) {
        this.systemGainNode.connect(destination);
        this.systemGainNode.connect(this.analyser);
      }
    }

    this.mixedStream = destination.stream;

    // 4. Setup MediaRecorder for Video (if screen_video) or Audio
    if (isScreenRecording && this.systemStream && this.systemStream.getVideoTracks().length > 0) {
      // Combine video track with mixed audio destination stream
      const videoTrack = this.systemStream.getVideoTracks()[0];
      const audioTracks = this.mixedStream.getAudioTracks();
      this.combinedVideoStream = new MediaStream([videoTrack, ...audioTracks]);

      const videoMimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=h264,opus",
        "video/webm",
        "video/mp4",
        "",
      ];
      let selectedVideoMime = "";
      for (const m of videoMimeTypes) {
        if (m === "" || MediaRecorder.isTypeSupported(m)) {
          selectedVideoMime = m;
          break;
        }
      }

      this.mediaRecorder = selectedVideoMime
        ? new MediaRecorder(this.combinedVideoStream, {
            mimeType: selectedVideoMime,
            videoBitsPerSecond: this.videoResolution === "1080p" ? 4000000 : 2500000,
            audioBitsPerSecond: 192000,
          })
        : new MediaRecorder(this.combinedVideoStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      // Also record pristine audio in parallel so we can encode clean MP3 for AI & audio player
      const audioMimes = ["audio/webm;codecs=opus", "audio/webm", ""];
      let selectedAudioMime = "";
      for (const m of audioMimes) {
        if (m === "" || MediaRecorder.isTypeSupported(m)) {
          selectedAudioMime = m;
          break;
        }
      }

      try {
        this.audioMediaRecorder = selectedAudioMime
          ? new MediaRecorder(this.mixedStream, { mimeType: selectedAudioMime, audioBitsPerSecond: 192000 })
          : new MediaRecorder(this.mixedStream);

        this.audioMediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.audioRecordedChunks.push(event.data);
          }
        };
        this.audioMediaRecorder.start(1000);
      } catch (e) {
        console.warn("Secondary audio recorder init fallback:", e);
      }
    } else {
      // Pure Audio Recording
      const mimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "",
      ];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (m === "" || MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      this.mediaRecorder = selectedMime
        ? new MediaRecorder(this.mixedStream, { mimeType: selectedMime, audioBitsPerSecond: 192000 })
        : new MediaRecorder(this.mixedStream);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
    }

    // Slice in 1-second chunks for resilient recording
    this.mediaRecorder.start(1000);
    this.startTime = Date.now();
    this.isRecording = true;

    // Start live speech recognizer for continuous live transcription
    if (this.speechRecognizer && this.speechRecognizer.isAvailable()) {
      this.speechRecognizer.start((text, isFinal) => {
        const currentSec = Math.floor(this.getElapsedTime());
        let seg: TranscriptSegment | undefined;

        if (isFinal && text.trim()) {
          this.liveTranscript += (this.liveTranscript ? " " : "") + text.trim();

          let speakerLabel = "Participante";
          let segChannel: "mic" | "system" | "mixed" = "mixed";

          if (sourceType === "dual_channels") {
            speakerLabel = this.hostName || "Você (Microfone)";
            segChannel = "mic";
          } else if (sourceType === "mic") {
            speakerLabel = this.hostName || "Você (Microfone)";
            segChannel = "mic";
          } else if (sourceType === "system") {
            speakerLabel = "Google Meet / PC";
            segChannel = "system";
          }

          seg = {
            id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            startTime: currentSec,
            timeFormatted: formatTime(currentSec),
            speaker: speakerLabel,
            channel: segChannel,
            text: text.trim(),
          };
          this.transcriptSegments.push(seg);
        }
        if (onTranscriptChunk) {
          onTranscriptChunk(text, isFinal, seg);
        }
      }, this.startTime);
    }
  }

  public setSystemVolume(vol: number) {
    this.systemVolume = vol;
    if (this.systemGainNode) {
      this.systemGainNode.gain.value = vol;
    }
  }

  public setMicVolume(vol: number) {
    this.micVolume = vol;
    if (this.micGainNode) {
      this.micGainNode.gain.value = vol;
    }
  }

  public addMarker(
    label: string,
    type: AudioMarker["type"] = "requisito",
    note?: string
  ): AudioMarker {
    const elapsed = this.getElapsedTime();
    const marker: AudioMarker = {
      id: `mark-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: elapsed,
      timeFormatted: formatTime(elapsed),
      label: label.trim() || `Marcador em ${formatTime(elapsed)}`,
      type,
      note,
    };
    this.markers.push(marker);
    return marker;
  }

  public getMarkers(): AudioMarker[] {
    return [...this.markers];
  }

  public getLiveTranscript(): string {
    return this.liveTranscript;
  }

  public getTranscriptSegments(): TranscriptSegment[] {
    return [...this.transcriptSegments];
  }

  public getElapsedTime(): number {
    if (!this.isRecording) return 0;
    if (this.isPaused) {
      return (this.pausedTime - this.startTime - this.totalPausedDuration) / 1000;
    }
    return (Date.now() - this.startTime - this.totalPausedDuration) / 1000;
  }

  public pauseRecording(): void {
    if (this.mediaRecorder && this.isRecording && !this.isPaused) {
      this.mediaRecorder.pause();
      if (this.audioMediaRecorder && this.audioMediaRecorder.state === "recording") {
        this.audioMediaRecorder.pause();
      }
      this.isPaused = true;
      this.pausedTime = Date.now();
      if (this.speechRecognizer) {
        this.speechRecognizer.stop();
      }
    }
  }

  public resumeRecording(): void {
    if (this.mediaRecorder && this.isRecording && this.isPaused) {
      this.mediaRecorder.resume();
      if (this.audioMediaRecorder && this.audioMediaRecorder.state === "paused") {
        this.audioMediaRecorder.resume();
      }
      this.totalPausedDuration += Date.now() - this.pausedTime;
      this.isPaused = false;
      if (this.speechRecognizer) {
        this.speechRecognizer.start(() => {}, this.startTime);
      }
    }
  }

  public getAudioLevels(): AudioLevels {
    const defaultData = new Uint8Array(128);
    if (!this.analyser) {
      return {
        overallLevel: 0,
        micLevel: 0,
        systemLevel: 0,
        timeData: defaultData,
        freqData: defaultData,
      };
    }

    const timeData = new Uint8Array(this.analyser.fftSize);
    const freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(timeData);
    this.analyser.getByteFrequencyData(freqData);

    let sum = 0;
    for (let i = 0; i < freqData.length; i++) {
      sum += freqData[i];
    }
    const overallLevel = Math.min(100, Math.round((sum / (freqData.length * 255)) * 100));

    // Mic Level
    let micLevel = 0;
    let micFreqData: Uint8Array | undefined;
    if (this.micAnalyser) {
      micFreqData = new Uint8Array(this.micAnalyser.frequencyBinCount);
      this.micAnalyser.getByteFrequencyData(micFreqData);
      let micSum = 0;
      for (let i = 0; i < micFreqData.length; i++) micSum += micFreqData[i];
      micLevel = Math.min(100, Math.round((micSum / (micFreqData.length * 255)) * 100));
    }

    // System Level
    let systemLevel = 0;
    let systemFreqData: Uint8Array | undefined;
    if (this.systemAnalyser) {
      systemFreqData = new Uint8Array(this.systemAnalyser.frequencyBinCount);
      this.systemAnalyser.getByteFrequencyData(systemFreqData);
      let sysSum = 0;
      for (let i = 0; i < systemFreqData.length; i++) sysSum += systemFreqData[i];
      systemLevel = Math.min(100, Math.round((sysSum / (systemFreqData.length * 255)) * 100));
    }

    return {
      overallLevel,
      micLevel,
      systemLevel,
      timeData,
      freqData,
      micFreqData,
      systemFreqData,
    };
  }

  public async stopRecording(): Promise<StopRecordingResult> {
    return new Promise(async (resolve, reject) => {
      if (!this.mediaRecorder) {
        this.releaseWakeLock();
        reject(new Error("Gravador não iniciado."));
        return;
      }

      const totalDuration = this.getElapsedTime();

      if (this.speechRecognizer) {
        this.speechRecognizer.stop();
      }

      if (this.audioMediaRecorder && this.audioMediaRecorder.state !== "inactive") {
        try {
          this.audioMediaRecorder.stop();
        } catch (e) {}
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const isVideo = this.recordTarget === "screen_video";
          const rawBlob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder?.mimeType || (isVideo ? "video/webm" : "audio/webm"),
          });

          let finalMp3Blob: Blob;
          let videoBlob: Blob | undefined = undefined;

          if (isVideo) {
            videoBlob = rawBlob;
            // For video mode, convert the parallel audio chunks to MP3 (or audio from rawBlob)
            try {
              const rawAudioBlob =
                this.audioRecordedChunks.length > 0
                  ? new Blob(this.audioRecordedChunks, { type: "audio/webm" })
                  : rawBlob;

              const audioBuffer = await convertBlobToAudioBuffer(rawAudioBlob);
              finalMp3Blob = await convertAudioBufferToMp3(audioBuffer, 192);
            } catch (encodeErr) {
              console.warn("MP3 audio extraction fallback:", encodeErr);
              finalMp3Blob = this.audioRecordedChunks.length > 0
                ? new Blob(this.audioRecordedChunks, { type: "audio/webm" })
                : rawBlob;
            }
          } else {
            try {
              // Convert to AudioBuffer & encode to MP3 using lamejs at 192kbps
              const audioBuffer = await convertBlobToAudioBuffer(rawBlob);
              finalMp3Blob = await convertAudioBufferToMp3(audioBuffer, 192);
            } catch (encodeErr) {
              console.warn("Direct MP3 encoding notice, saving high-fidelity audio Blob fallback:", encodeErr);
              finalMp3Blob = rawBlob;
            }
          }

          this.cleanupStreams();
          this.releaseWakeLock();
          this.isRecording = false;
          this.isPaused = false;

          resolve({
            mp3Blob: finalMp3Blob,
            videoBlob,
            mediaType: isVideo ? "video" : "audio",
            videoResolution: isVideo ? this.videoResolution : undefined,
            videoFps: isVideo ? this.videoFps : undefined,
            duration: Math.round(totalDuration),
            markers: this.markers,
            liveTranscript: this.liveTranscript,
            transcriptSegments: this.transcriptSegments,
          });
        } catch (err) {
          this.cleanupStreams();
          this.releaseWakeLock();
          this.isRecording = false;
          reject(err);
        }
      };

      try {
        this.mediaRecorder.stop();
      } catch (err) {
        this.cleanupStreams();
        this.releaseWakeLock();
        reject(err);
      }
    });
  }

  private cleanupStreams() {
    if (this.systemStream) {
      this.systemStream.getTracks().forEach((t) => t.stop());
      this.systemStream = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    if (this.mixedStream) {
      this.mixedStream.getTracks().forEach((t) => t.stop());
      this.mixedStream = null;
    }
    if (this.combinedVideoStream) {
      this.combinedVideoStream.getTracks().forEach((t) => t.stop());
      this.combinedVideoStream = null;
    }
    if (this.channelMerger) {
      this.channelMerger.disconnect();
      this.channelMerger = null;
    }
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.micAnalyser = null;
    this.systemAnalyser = null;
  }
}
