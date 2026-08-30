export type AudioSourceType = "system" | "mic" | "dual_mix";

export interface AudioMarker {
  id: string;
  timestamp: number; // in seconds
  timeFormatted: string;
  label: string;
  type: "requisito" | "decisao" | "duvida" | "tarefa" | "geral";
  note?: string;
}

export interface TranscriptSegment {
  id: string;
  startTime: number; // in seconds
  endTime?: number;
  timeFormatted: string; // e.g. "01:24"
  speaker?: string;
  text: string;
}

export interface KeywordSearchResult {
  id: string;
  meetingId: string;
  meetingTitle: string;
  timestamp: number; // in seconds
  timeFormatted: string;
  textSnippet: string;
  matchedKeyword: string;
  speaker?: string;
  source: "transcript" | "marker" | "summary" | "requirement";
}

export interface FunctionalRequirement {
  id: string; // e.g. RF01
  title: string;
  description: string;
  priority: "Alta" | "Média" | "Baixa";
  complexity?: "P" | "M" | "G";
  sourceQuote?: string;
  status?: "Pendente" | "Em Análise" | "Aprovado" | "Implementado";
}

export interface NonFunctionalRequirement {
  id: string; // e.g. RNF01
  category: "Performance" | "Segurança" | "Usabilidade" | "Compatibilidade" | "Disponibilidade" | "Arquitetura";
  description: string;
  complianceCriteria: string;
}

export interface BusinessRule {
  id: string; // e.g. RN01
  rule: string;
  impact?: string;
}

export interface UserStory {
  id: string;
  role: string;
  action: string;
  benefit: string;
  gherkin: string; // Given... When... Then...
}

export interface ActionItem {
  id: string;
  task: string;
  assignee?: string;
  deadline?: string;
  completed: boolean;
  priority?: "Alta" | "Média" | "Baixa";
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
}

export interface ReviewQuestion {
  id: string;
  question: string;
  answer: string;
  explanation?: string;
}

export interface GlossaryItem {
  term: string;
  definition: string;
}

export interface StudyGuide {
  coreConcepts: string[];
  flashcards: Flashcard[];
  reviewQuestions: ReviewQuestion[];
  glossary: GlossaryItem[];
}

export interface MeetingAnalysisData {
  transcription?: string;
  transcriptSegments?: TranscriptSegment[];
  executiveSummary?: string;
  conciseSummary?: string;
  keyDiscussionPoints?: string[];
  keyPoints?: string[];
  functionalRequirements?: FunctionalRequirement[];
  nonFunctionalRequirements?: NonFunctionalRequirement[];
  businessRules?: BusinessRule[];
  userStories?: UserStory[];
  actionItems?: ActionItem[];
  studyGuide?: StudyGuide;
  generatedAt?: string;
  mode?: "ai" | "offline";
}

export interface MeetingRecord {
  id: string;
  title: string;
  createdAt: string;
  duration: number; // in seconds
  durationFormatted: string;
  sourceType: AudioSourceType;
  audioBlob?: Blob;
  audioUrl?: string;
  fileSizeFormatted?: string;
  format: "mp3" | "wav" | "webm";
  transcript: string;
  transcriptSegments?: TranscriptSegment[];
  offlineNotes?: string;
  markers: AudioMarker[];
  tags: string[];
  favorite: boolean;
  analysis?: MeetingAnalysisData;
  chatHistory?: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }>;
}
