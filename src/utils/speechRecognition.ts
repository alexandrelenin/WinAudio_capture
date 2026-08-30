// Web Speech API wrapper for real-time live transcription during recording
export interface SpeechCallback {
  (text: string, isFinal: boolean, timestamp: number): void;
}

export class LiveSpeechRecognizer {
  private recognition: any = null;
  private isListening: boolean = false;
  private callback: SpeechCallback | null = null;
  private lang: string = "pt-BR";
  private shouldKeepAlive: boolean = false;
  private startTime: number = 0;

  constructor(lang: string = "pt-BR") {
    this.lang = lang;
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognitionClass) {
      try {
        this.recognition = new SpeechRecognitionClass();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.lang;

        this.recognition.onresult = (event: any) => {
          let interimTranscript = "";
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + " ";
            } else {
              interimTranscript += transcript;
            }
          }

          const elapsed = (Date.now() - this.startTime) / 1000;
          if (finalTranscript.trim() && this.callback) {
            this.callback(finalTranscript.trim(), true, elapsed);
          } else if (interimTranscript.trim() && this.callback) {
            this.callback(interimTranscript.trim(), false, elapsed);
          }
        };

        this.recognition.onerror = (event: any) => {
          // Ignore network / no-speech harmless warnings
          if (event.error !== "no-speech") {
            console.warn("Speech recognition notice:", event.error);
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          if (this.shouldKeepAlive) {
            try {
              this.recognition.start();
              this.isListening = true;
            } catch (e) {
              // will restart on next cycle
            }
          }
        };
      } catch (e) {
        console.warn("Speech recognition initialization failed:", e);
      }
    }
  }

  public isAvailable(): boolean {
    return !!this.recognition;
  }

  public start(onTranscript: SpeechCallback, startTime: number = Date.now()) {
    if (!this.recognition) return;
    this.callback = onTranscript;
    this.startTime = startTime;
    this.shouldKeepAlive = true;
    if (!this.isListening) {
      try {
        this.recognition.lang = this.lang;
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        console.warn("Could not start recognition:", e);
      }
    }
  }

  public setLanguage(lang: string) {
    this.lang = lang;
    if (this.recognition) {
      this.recognition.lang = lang;
    }
  }

  public stop() {
    this.shouldKeepAlive = false;
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.isListening = false;
    }
  }
}
