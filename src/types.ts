export type AudioSourceType = "system" | "mic" | "dual_mix";

export type MeetingTemplateType =
  | "general"
  | "software_requirements"
  | "one_on_one"
  | "brainstorming"
  | "sales_discovery"
  | "training_class";

export type AIProviderType =
  | "gemini_server"
  | "gemini_custom"
  | "openai"
  | "anthropic"
  | "groq"
  | "custom_openai";

export interface AISettings {
  provider: AIProviderType;
  apiKey: string;
  model: string;
  customBaseUrl?: string;
  autoProcessWithAiOnRecordEnd: boolean; // se roda IA pós-gravação
  enableLiveBrowserSpeech: boolean; // transcrição contínua no navegador
  defaultTemplate: MeetingTemplateType;
}

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

export interface IdeaItem {
  id: string;
  title: string;
  description: string;
  category?: string;
  impactEffort?: "Alto Impacto / Baixo Esforço" | "Alto Impacto / Alto Esforço" | "Baixo Impacto / Baixo Esforço" | "Baixo Impacto / Alto Esforço";
  status?: "Aprovada" | "Para Avaliação" | "Descartada";
}

export interface OneOnOneInsight {
  topicsDiscussed: string[];
  feedbackGiven: string[];
  careerAndGrowth: string[];
  blockersAndSupport: string[];
  agreements: string[];
}

export interface SalesInsight {
  clientNeeds: string[];
  budgetNotes?: string;
  keyStakeholders?: string[];
  objectionsRaised: string[];
  nextStepsAgreed: string[];
}

export interface MeetingAnalysisData {
  template?: MeetingTemplateType;
  transcription?: string;
  transcriptSegments?: TranscriptSegment[];
  executiveSummary?: string;
  conciseSummary?: string;
  formalMinutes?: string; // Ata formal da reunião
  keyDiscussionPoints?: string[];
  keyPoints?: string[];
  decisions?: string[]; // Decisões tomadas
  functionalRequirements?: FunctionalRequirement[];
  nonFunctionalRequirements?: NonFunctionalRequirement[];
  businessRules?: BusinessRule[];
  userStories?: UserStory[];
  actionItems?: ActionItem[];
  studyGuide?: StudyGuide;
  ideas?: IdeaItem[];
  oneOnOne?: OneOnOneInsight;
  salesInsights?: SalesInsight;
  generatedAt?: string;
  mode?: "ai" | "offline";
  providerUsed?: string;
  modelUsed?: string;
}

export interface MeetingRecord {
  id: string;
  title: string;
  template?: MeetingTemplateType;
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
