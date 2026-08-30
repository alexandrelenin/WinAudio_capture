import { MeetingRecord, KeywordSearchResult, TranscriptSegment } from "../types";
import { formatTime } from "./audioEncoder";

/**
 * Searches across all recorded audio files for keyword mentions and returns timecoded hits.
 */
export function searchAudioFiles(
  meetings: MeetingRecord[],
  query: string
): KeywordSearchResult[] {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim().toLowerCase();
  const results: KeywordSearchResult[] = [];

  for (const meeting of meetings) {
    const meetingDuration = meeting.duration || 60;

    // 1. Search in Transcript Segments (Most precise timecodes)
    if (meeting.transcriptSegments && meeting.transcriptSegments.length > 0) {
      for (const seg of meeting.transcriptSegments) {
        if (seg.text.toLowerCase().includes(cleanQuery)) {
          results.push({
            id: `res-seg-${seg.id}-${results.length}`,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            timestamp: seg.startTime,
            timeFormatted: seg.timeFormatted || formatTime(seg.startTime),
            textSnippet: extractSnippet(seg.text, cleanQuery),
            matchedKeyword: query.trim(),
            speaker: seg.speaker,
            source: "transcript",
          });
        }
      }
    } else if (meeting.transcript) {
      // 2. Search in raw transcript with timecode estimation or line parsing
      const lines = meeting.transcript.split("\n").filter(Boolean);
      const totalLines = lines.length;

      // Check if lines have [MM:SS] markers
      let matchedInLines = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toLowerCase().includes(cleanQuery)) {
          matchedInLines = true;
          // Try to extract timestamp like [01:23] or 01:23
          const matchTime = line.match(/\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?/);
          let timestamp = 0;
          let timeFormatted = "00:00";

          if (matchTime) {
            timeFormatted = matchTime[1];
            timestamp = parseTimeToSeconds(timeFormatted);
          } else {
            // Proportional estimation based on line index
            timestamp = Math.round((i / Math.max(1, totalLines)) * meetingDuration);
            timeFormatted = formatTime(timestamp);
          }

          results.push({
            id: `res-line-${meeting.id}-${i}`,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            timestamp,
            timeFormatted,
            textSnippet: extractSnippet(line, cleanQuery),
            matchedKeyword: query.trim(),
            source: "transcript",
          });
        }
      }

      // If matched nothing in line-by-line, test words
      if (!matchedInLines && meeting.transcript.toLowerCase().includes(cleanQuery)) {
        const words = meeting.transcript.split(/\s+/);
        const queryWords = cleanQuery.split(/\s+/);
        for (let w = 0; w < words.length; w++) {
          if (words[w].toLowerCase().includes(queryWords[0])) {
            const estimatedSec = Math.round((w / Math.max(1, words.length)) * meetingDuration);
            const snippetStart = Math.max(0, w - 8);
            const snippetEnd = Math.min(words.length, w + 12);
            const snippet = words.slice(snippetStart, snippetEnd).join(" ");

            results.push({
              id: `res-word-${meeting.id}-${w}`,
              meetingId: meeting.id,
              meetingTitle: meeting.title,
              timestamp: estimatedSec,
              timeFormatted: formatTime(estimatedSec),
              textSnippet: `...${snippet}...`,
              matchedKeyword: query.trim(),
              source: "transcript",
            });
            break; // take first relevant cluster
          }
        }
      }
    }

    // 3. Search in Audio Markers
    if (meeting.markers && meeting.markers.length > 0) {
      for (const m of meeting.markers) {
        const fullMarkerText = `${m.label} ${m.note || ""}`;
        if (fullMarkerText.toLowerCase().includes(cleanQuery)) {
          results.push({
            id: `res-mark-${m.id}`,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            timestamp: m.timestamp,
            timeFormatted: m.timeFormatted,
            textSnippet: extractSnippet(fullMarkerText, cleanQuery),
            matchedKeyword: query.trim(),
            source: "marker",
          });
        }
      }
    }

    // 4. Search in Functional Requirements
    if (meeting.analysis?.functionalRequirements) {
      for (const rf of meeting.analysis.functionalRequirements) {
        const fullRfText = `${rf.id}: ${rf.title} - ${rf.description} ${rf.sourceQuote || ""}`;
        if (fullRfText.toLowerCase().includes(cleanQuery)) {
          // Estimate timestamp from quote or default to beginning
          results.push({
            id: `res-rf-${rf.id}`,
            meetingId: meeting.id,
            meetingTitle: meeting.title,
            timestamp: 0,
            timeFormatted: "00:00",
            textSnippet: extractSnippet(fullRfText, cleanQuery),
            matchedKeyword: query.trim(),
            source: "requirement",
          });
        }
      }
    }

    // 5. Search in Summary / Key Points
    if (meeting.analysis?.conciseSummary?.toLowerCase().includes(cleanQuery)) {
      results.push({
        id: `res-summary-${meeting.id}`,
        meetingId: meeting.id,
        meetingTitle: meeting.title,
        timestamp: 0,
        timeFormatted: "00:00",
        textSnippet: extractSnippet(meeting.analysis.conciseSummary, cleanQuery),
        matchedKeyword: query.trim(),
        source: "summary",
      });
    }
  }

  // Sort by meeting and timestamp
  return results.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Extracts a windowed snippet around the matched keyword for quick context.
 */
function extractSnippet(text: string, query: string, maxLength: number = 140): string {
  const lower = text.toLowerCase();
  const index = lower.indexOf(query.toLowerCase());
  if (index === -1) return text.slice(0, maxLength);

  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + query.length + 60);
  let snippet = text.slice(start, end).trim();

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet = snippet + "...";

  return snippet;
}

/**
 * Converts a time string "MM:SS" or "HH:MM:SS" into total seconds.
 */
export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.replace(/[\[\]]/g, "").trim();
  const parts = clean.split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}
