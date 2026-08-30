// MP3 / WAV Audio Encoder Utility
// @ts-ignore
import * as lamejsModule from "lamejs";

// Safe import resolver for lamejs in ESM/Vite
const lamejs = (lamejsModule as any).default || lamejsModule;

export async function convertAudioBufferToMp3(
  audioBuffer: AudioBuffer,
  bitRate: number = 128
): Promise<Blob> {
  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = Math.min(channels, 2);

  // Initialize Mp3Encoder
  const Mp3EncoderClass = lamejs.Mp3Encoder || (window as any).lamejs?.Mp3Encoder;
  if (!Mp3EncoderClass) {
    console.warn("lamejs Mp3Encoder not found directly, falling back to WAV");
    return convertAudioBufferToWav(audioBuffer);
  }

  const mp3encoder = new Mp3EncoderClass(numChannels, sampleRate, bitRate);
  const mp3Data: Uint8Array[] = [];

  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : leftChannel;

  const leftPcm = convertFloatTo16BitPCM(leftChannel);
  const rightPcm = convertFloatTo16BitPCM(rightChannel);

  const sampleBlockSize = 1152;
  const numSamples = leftPcm.length;

  for (let i = 0; i < numSamples; i += sampleBlockSize) {
    const leftChunk = leftPcm.subarray(i, i + sampleBlockSize);
    let mp3buf: Int8Array | Uint8Array;

    if (numChannels === 1) {
      mp3buf = mp3encoder.encodeBuffer(leftChunk);
    } else {
      const rightChunk = rightPcm.subarray(i, i + sampleBlockSize);
      mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    }

    if (mp3buf.length > 0) {
      mp3Data.push(new Uint8Array(mp3buf));
    }
  }

  const mp3bufFlush = mp3encoder.flush();
  if (mp3bufFlush.length > 0) {
    mp3Data.push(new Uint8Array(mp3bufFlush));
  }

  return new Blob(mp3Data, { type: "audio/mp3" });
}

function convertFloatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

export async function convertBlobToAudioBuffer(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const audioCtx = new AudioContextClass();
  try {
    return await audioCtx.decodeAudioData(arrayBuffer);
  } finally {
    audioCtx.close();
  }
}

export function convertAudioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numChannels === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    result = buffer.getChannelData(0);
  }

  const dataLength = result.length * (bitDepth / 8);
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");

  // FMT sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
  view.setUint16(32, numChannels * (bitDepth / 8), true);
  view.setUint16(34, bitDepth, true);

  // DATA sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < result.length; i++) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([view], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);

  let index = 0;
  let inputIndex = 0;

  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) {
    const remMins = mins % 60;
    return `${hrs.toString().padStart(2, "0")}:${remMins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
