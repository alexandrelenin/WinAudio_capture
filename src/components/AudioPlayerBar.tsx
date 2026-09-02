import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  Bookmark,
  Search,
  X,
  Clock,
  Video,
  Maximize2,
  Minimize2,
  Pipette,
  Film,
  Sparkles,
} from "lucide-react";
import { MeetingRecord } from "../types";
import { formatTime } from "../utils/audioEncoder";
import { downloadBlob } from "../utils/exportUtils";
import { searchAudioFiles } from "../utils/searchUtils";

interface AudioPlayerBarProps {
  meeting: MeetingRecord;
  seekToTimestamp?: number | null;
  onClearSeek?: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  meeting,
  seekToTimestamp,
  onClearSeek,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(meeting.duration || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [mediaSrc, setMediaSrc] = useState<string>("");
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [showVideoDisplay, setShowVideoDisplay] = useState<boolean>(true);

  // In-player keyword search
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

  const hasVideo = Boolean(meeting.videoBlob || meeting.videoUrl || meeting.mediaType === "video");

  // Setup URLs
  useEffect(() => {
    let createdAudioUrl: string | null = null;
    let createdVideoUrl: string | null = null;

    if (meeting.videoBlob) {
      createdVideoUrl = URL.createObjectURL(meeting.videoBlob);
      setVideoSrc(createdVideoUrl);
    } else if (meeting.videoUrl) {
      setVideoSrc(meeting.videoUrl);
    }

    if (meeting.audioBlob) {
      createdAudioUrl = URL.createObjectURL(meeting.audioBlob);
      setMediaSrc(createdAudioUrl);
    } else if (meeting.audioUrl) {
      setMediaSrc(meeting.audioUrl);
    }

    return () => {
      if (createdAudioUrl) URL.revokeObjectURL(createdAudioUrl);
      if (createdVideoUrl) URL.revokeObjectURL(createdVideoUrl);
    };
  }, [meeting.audioBlob, meeting.audioUrl, meeting.videoBlob, meeting.videoUrl]);

  // Set active media element reference
  useEffect(() => {
    if (hasVideo && videoElementRef.current && showVideoDisplay) {
      mediaRef.current = videoElementRef.current;
    } else if (audioElementRef.current) {
      mediaRef.current = audioElementRef.current;
    } else if (videoElementRef.current) {
      mediaRef.current = videoElementRef.current;
    }
  }, [hasVideo, showVideoDisplay, videoSrc, mediaSrc]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Handle external seek requests (e.g. from keyword search clicks or transcript clicks)
  useEffect(() => {
    if (seekToTimestamp !== undefined && seekToTimestamp !== null) {
      if (mediaRef.current) {
        mediaRef.current.currentTime = seekToTimestamp;
        setCurrentTime(seekToTimestamp);
        mediaRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
      if (onClearSeek) onClearSeek();
    }
  }, [seekToTimestamp, onClearSeek]);

  const searchHits = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchAudioFiles([meeting], searchQuery);
  }, [meeting, searchQuery]);

  const handlePlayPause = () => {
    const el = mediaRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
    } else {
      el.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    const el = mediaRef.current;
    if (el) {
      setCurrentTime(el.currentTime);
      if (el.duration && !isNaN(el.duration)) {
        setDuration(el.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (mediaRef.current) {
      mediaRef.current.currentTime = val;
    }
  };

  const skipTime = (seconds: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = Math.max(0, Math.min(duration, mediaRef.current.currentTime + seconds));
    }
  };

  const jumpToTimestamp = (timestamp: number) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = timestamp;
      setCurrentTime(timestamp);
      if (!isPlaying) {
        mediaRef.current.play().catch(console.error);
        setIsPlaying(true);
      }
    }
  };

  const handleDownloadMp3 = () => {
    if (meeting.audioBlob) {
      const filename = `${meeting.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")}.mp3`;
      downloadBlob(meeting.audioBlob, filename);
    }
  };

  const handleDownloadVideo = () => {
    if (meeting.videoBlob) {
      const filename = `${meeting.title.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_")}_tela.webm`;
      downloadBlob(meeting.videoBlob, filename);
    }
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  const togglePiP = async () => {
    if (!videoElementRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoElementRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn("PiP error:", e);
    }
  };

  return (
    <div className="bg-[#0E1015] border border-[#22252D] rounded-xl p-3.5 shadow-md text-[#EDEDED] space-y-3">
      {/* Video Screen View Player (if video was recorded) */}
      {hasVideo && videoSrc && showVideoDisplay && (
        <div
          ref={videoContainerRef}
          className="relative bg-black rounded-lg overflow-hidden border border-[#22252D] group aspect-video max-h-[420px] mx-auto flex items-center justify-center shadow-lg"
        >
          <video
            ref={videoElementRef}
            src={videoSrc}
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
            onLoadedMetadata={() => {
              if (videoElementRef.current && videoElementRef.current.duration) {
                setDuration(videoElementRef.current.duration);
              }
            }}
            onClick={handlePlayPause}
            className="w-full h-full object-contain cursor-pointer"
          />

          {/* Video Overlay Badges */}
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <Film className="w-3 h-3 text-emerald-400" />
              Vídeo da Tela Gravada ({meeting.videoResolution || "1080p"} {meeting.videoFps ? `• ${meeting.videoFps}fps` : ""})
            </span>
          </div>

          {/* Top Right Controls (PiP, Fullscreen) */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
            <button
              type="button"
              onClick={togglePiP}
              className="p-1.5 rounded-md bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition cursor-pointer"
              title="Modo Picture-in-Picture (Janela Flutuante)"
            >
              <Video className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-md bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 transition cursor-pointer"
              title="Tela Cheia"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center Play/Pause button on hover */}
          {!isPlaying && (
            <button
              type="button"
              onClick={handlePlayPause}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-blue-600/90 hover:bg-blue-500 text-white flex items-center justify-center shadow-xl transform group-hover:scale-110 transition cursor-pointer"
            >
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </button>
          )}
        </div>
      )}

      {/* Audio element fallback (when video is not present or user switches to audio-only) */}
      {(!hasVideo || !showVideoDisplay) && mediaSrc && (
        <audio
          ref={audioElementRef}
          src={mediaSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (audioElementRef.current && audioElementRef.current.duration) {
              setDuration(audioElementRef.current.duration);
            }
          }}
        />
      )}

      {/* Title & Info row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-bold text-xs text-white truncate max-w-xs sm:max-w-md">
            {meeting.title}
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#1C1F26] text-blue-400 font-mono border border-[#2A2D35] flex items-center gap-1">
            {hasVideo ? <Film className="w-2.5 h-2.5 text-blue-400" /> : null}
            {hasVideo ? "VÍDEO DA TELA + MP3" : `${meeting.format?.toUpperCase() || "MP3"}`} • {meeting.fileSizeFormatted || "Local"}
          </span>
        </div>

        {/* Search, Toggle Video & Download buttons */}
        <div className="flex items-center gap-1.5">
          {hasVideo && (
            <button
              type="button"
              onClick={() => setShowVideoDisplay(!showVideoDisplay)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                showVideoDisplay
                  ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                  : "bg-[#1C1F26] text-[#8E929E] hover:text-white border-[#2A2D35]"
              }`}
              title="Alternar entre modo vídeo e áudio compacto"
            >
              <Film className="w-3 h-3 text-emerald-400" />
              <span>{showVideoDisplay ? "Ocultar Vídeo" : "Exibir Vídeo"}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsSearching(!isSearching)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              isSearching
                ? "bg-blue-600/20 text-blue-300 border-blue-500/40"
                : "bg-[#1C1F26] text-[#8E929E] hover:text-white border-[#2A2D35]"
            }`}
            title="Buscar palavras-chave nesta gravação"
          >
            <Search className="w-3 h-3 text-blue-400" />
            <span>Localizar</span>
          </button>

          {meeting.markers && meeting.markers.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <select
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) jumpToTimestamp(val);
                }}
                className="bg-[#1C1F26] border border-[#2A2D35] rounded-lg px-2 py-1 text-[11px] text-[#C4C7D0] focus:outline-none"
              >
                <option value="">Marcadores ({meeting.markers.length})...</option>
                {meeting.markers.map((m) => (
                  <option key={m.id} value={m.timestamp}>
                    {m.timeFormatted} - {m.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Download Video (if available) */}
          {hasVideo && meeting.videoBlob && (
            <button
              onClick={handleDownloadVideo}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer"
              title="Baixar gravação de vídeo da tela em WebM/MP4"
            >
              <Film className="w-3 h-3" />
              <span>Baixar Vídeo</span>
            </button>
          )}

          {/* Download MP3 */}
          <button
            onClick={handleDownloadMp3}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-sm transition cursor-pointer"
            title="Baixar arquivo de áudio gravado em MP3"
          >
            <Download className="w-3 h-3" />
            <span>Baixar MP3</span>
          </button>
        </div>
      </div>

      {/* In-player Keyword Search Bar */}
      {isSearching && (
        <div className="p-2.5 rounded-lg bg-[#14161B] border border-[#22252D] space-y-2">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar palavra ou tema neste áudio/vídeo (ex: prazo, RF01, segurança, arquitetura)..."
              autoFocus
              className="flex-1 bg-[#0E1015] border border-[#2A2D35] focus:border-blue-500 rounded-md px-2.5 py-1 text-xs text-white placeholder-[#6B7280] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="text-[#8E929E] hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {searchHits.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 max-h-24 overflow-y-auto">
              <span className="text-[10px] text-[#8E929E] font-semibold">Timecodes encontrados:</span>
              {searchHits.map((hit) => (
                <button
                  key={hit.id}
                  type="button"
                  onClick={() => jumpToTimestamp(hit.timestamp)}
                  className="px-2 py-0.5 rounded bg-blue-500/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  <span>{hit.timeFormatted}</span>
                </button>
              ))}
            </div>
          )}

          {searchQuery && searchHits.length === 0 && (
            <p className="text-[11px] text-[#6B7280] italic">
              Nenhuma ocorrência encontrada para "{searchQuery}" neste áudio/vídeo.
            </p>
          )}
        </div>
      )}

      {/* Seek bar */}
      <div className="space-y-0.5">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.1"
            value={currentTime}
            onChange={handleSeek}
            className="w-full accent-blue-500 h-1.5 bg-[#22252D] rounded-lg cursor-pointer transition"
          />

          {/* Marker pins on seek bar */}
          {meeting.markers && duration > 0 && (
            <div className="absolute top-0 left-0 right-0 h-1.5 pointer-events-none">
              {meeting.markers.map((m) => {
                const leftPercent = Math.min(100, Math.max(0, (m.timestamp / duration) * 100));
                return (
                  <div
                    key={m.id}
                    style={{ left: `${leftPercent}%` }}
                    className="absolute top-[-2px] w-1.5 h-2.5 bg-amber-400 rounded-full shadow"
                    title={`[${m.timeFormatted}] ${m.label}`}
                  />
                );
              })}
            </div>
          )}

          {/* Keyword Search hit pins on seek bar */}
          {searchHits.length > 0 && duration > 0 && (
            <div className="absolute top-0 left-0 right-0 h-1.5 pointer-events-none">
              {searchHits.map((h) => {
                const leftPercent = Math.min(100, Math.max(0, (h.timestamp / duration) * 100));
                return (
                  <div
                    key={h.id}
                    style={{ left: `${leftPercent}%` }}
                    className="absolute top-[-3px] w-2 h-3 bg-blue-400 rounded-full shadow-lg ring-1 ring-white/50 animate-pulse"
                    title={`[${h.timeFormatted}] Menção a: ${h.matchedKeyword}`}
                  />
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-between text-[10px] font-mono text-[#8E929E]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        {/* Playback rate */}
        <div className="flex items-center gap-1">
          {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
            <button
              key={rate}
              onClick={() => setPlaybackRate(rate)}
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono transition ${
                playbackRate === rate
                  ? "bg-blue-600 text-white"
                  : "bg-[#1C1F26] text-[#8E929E] hover:text-white border border-[#2A2D35]"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Center transport buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => skipTime(-5)}
            className="p-1 rounded-lg bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] border border-[#2A2D35] transition cursor-pointer"
            title="Voltar 5 segundos"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePlayPause}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition transform active:scale-95 cursor-pointer"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
          </button>

          <button
            onClick={() => skipTime(10)}
            className="p-1 rounded-lg bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] border border-[#2A2D35] transition cursor-pointer"
            title="Avançar 10 segundos"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (mediaRef.current) {
                mediaRef.current.muted = !isMuted;
                setIsMuted(!isMuted);
              }
            }}
            className="text-[#8E929E] hover:text-white cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (mediaRef.current) {
                mediaRef.current.volume = v;
                mediaRef.current.muted = false;
                setIsMuted(false);
              }
            }}
            className="w-16 accent-blue-500 h-1.5 bg-[#22252D] rounded cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};
