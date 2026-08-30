import { AudioSourceType, AudioMarker, TranscriptSegment } from "../types";
import { convertAudioBufferToMp3, convertBlobToAudioBuffer, formatTime } from "./audioEncoder";
import { LiveSpeechRecognizer } from "./speechRecognition";

export interface AudioLevels {
  overallLevel: number;
  timeData: Uint8Array;
  freqData: Uint8Array;
}

export class AudioCaptureEngine {
  private audioCtx: AudioContext | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private systemStream: MediaStream | null = null;
  private micStream: MediaStream | null = null;
  private mixedStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private systemGainNode: GainNode | null = null;
  private micGainNode: GainNode | null = null;

  private startTime: number = 0;
  private pausedTime: number = 0;
  private totalPausedDuration: number = 0;
  private isRecording: boolean = false;
  private isPaused: boolean = false;

  private speechRecognizer: LiveSpeechRecognizer | null = null;
  private markers: AudioMarker[] = [];
  private liveTranscript: string = "";
  private transcriptSegments: TranscriptSegment[] = [];

  private wakeLockSentinel: any = null;
  private backgroundWorkerTimer: number | null = null;

  public systemVolume: number = 1.0;
  public micVolume: number = 1.0;
  public isContinuousMode: boolean = true;

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

  public async startRecording(
    sourceType: AudioSourceType,
    onTranscriptChunk?: (text: string, isFinal: boolean, segment?: TranscriptSegment) => void
  ): Promise<void> {
    this.recordedChunks = [];
    this.markers = [];
    this.liveTranscript = "";
    this.transcriptSegments = [];
    this.totalPausedDuration = 0;
    this.isPaused = false;

    // Acquire WakeLock for continuous background recording
    await this.acquireWakeLock();

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.audioCtx = new AudioContextClass();

    if (this.audioCtx.state === "suspended") {
      await this.audioCtx.resume();
    }

    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    const destination = this.audioCtx.createMediaStreamDestination();

    if (sourceType === "system" || sourceType === "dual_mix") {
      try {
        const displayOptions: any = {
          video: {
            displaySurface: "monitor",
          },
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

        this.systemStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);

        const audioTracks = this.systemStream.getAudioTracks();
        if (audioTracks.length === 0) {
          // If system only was chosen and no audio track, throw informative error
          if (sourceType === "system") {
            this.cleanupStreams();
            this.releaseWakeLock();
            throw new Error(
              "Nenhuma faixa de áudio do sistema foi capturada. No Windows (Chrome/Edge), selecione a aba 'Tela Inteira' ou 'Guia do Chrome' e marque a opção 'Compartilhar áudio do sistema' no canto inferior esquerdo da janela de seleção."
            );
          } else {
            console.warn("No system audio track in dual_mix; continuing with microphone only.");
          }
        }

        if (audioTracks.length > 0) {
          const systemSource = this.audioCtx.createMediaStreamSource(this.systemStream);
          this.systemGainNode = this.audioCtx.createGain();
          this.systemGainNode.gain.value = this.systemVolume;

          systemSource.connect(this.systemGainNode);
          this.systemGainNode.connect(destination);
          this.systemGainNode.connect(this.analyser);

          // Auto-stop if user clicks native browser "Stop sharing"
          audioTracks[0].onended = () => {
            console.log("System audio track ended by user.");
          };
        }
      } catch (err: any) {
        if (sourceType === "system") {
          this.cleanupStreams();
          this.releaseWakeLock();
          if (err.name === "NotAllowedError") {
            throw new Error("Permissão de captura de tela/áudio cancelada pelo usuário.");
          }
          throw err;
        } else {
          // In dual_mix, if user cancelled screen share, check if mic can still record
          console.warn("System audio capture skipped in dual_mix, falling back to mic:", err);
        }
      }
    }

    if (sourceType === "mic" || sourceType === "dual_mix") {
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
        this.micGainNode.connect(destination);
        // Connect mic to analyser so waveform animates on voice input
        this.micGainNode.connect(this.analyser);
      } catch (err: any) {
        this.cleanupStreams();
        this.releaseWakeLock();
        if (err.name === "NotAllowedError") {
          throw new Error("Acesso ao microfone foi negado. Permita o uso do microfone no Windows/Navegador.");
        }
        throw err;
      }
    }

    this.mixedStream = destination.stream;

    // Pick best supported MIME type
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

    // Slice audio in 1-second chunks for resilient continuous recording
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
          seg = {
            id: `seg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            startTime: currentSec,
            timeFormatted: formatTime(currentSec),
            speaker: sourceType === "system" ? "Áudio PC / Reunião" : sourceType === "mic" ? "Microfone" : "Participante",
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
      this.totalPausedDuration += Date.now() - this.pausedTime;
      this.isPaused = false;
      if (this.speechRecognizer) {
        this.speechRecognizer.start(() => {}, this.startTime);
      }
    }
  }

  public getAudioLevels(): AudioLevels {
    if (!this.analyser) {
      return {
        overallLevel: 0,
        timeData: new Uint8Array(128),
        freqData: new Uint8Array(128),
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

    return { overallLevel, timeData, freqData };
  }

  public async stopRecording(): Promise<{
    mp3Blob: Blob;
    duration: number;
    markers: AudioMarker[];
    liveTranscript: string;
    transcriptSegments: TranscriptSegment[];
  }> {
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

      this.mediaRecorder.onstop = async () => {
        try {
          const rawBlob = new Blob(this.recordedChunks, {
            type: this.mediaRecorder?.mimeType || "audio/webm",
          });

          let finalMp3Blob: Blob;
          try {
            // Convert to AudioBuffer & encode to MP3 using lamejs at 192kbps
            const audioBuffer = await convertBlobToAudioBuffer(rawBlob);
            finalMp3Blob = await convertAudioBufferToMp3(audioBuffer, 192);
          } catch (encodeErr) {
            console.warn("Direct MP3 encoding notice, saving high-fidelity audio Blob fallback:", encodeErr);
            finalMp3Blob = rawBlob;
          }

          this.cleanupStreams();
          this.releaseWakeLock();
          this.isRecording = false;
          this.isPaused = false;

          resolve({
            mp3Blob: finalMp3Blob,
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
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
  }
}
