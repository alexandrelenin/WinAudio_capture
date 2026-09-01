import { AISettings, MeetingTemplateType, AIProviderType } from "../types";

const SETTINGS_STORAGE_KEY = "winaudio_ai_settings_v2";

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: "gemini_server",
  apiKey: "",
  model: "gemini-2.5-flash",
  customBaseUrl: "",
  autoProcessWithAiOnRecordEnd: true,
  enableLiveBrowserSpeech: true,
  defaultTemplate: "general",
};

export const PROVIDER_DEFAULT_MODELS: Record<AIProviderType, string[]> = {
  gemini_server: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-3.7-flash"],
  gemini_custom: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-3.7-flash"],
  openai: ["gpt-4o", "gpt-4o-mini", "o3-mini", "o1-mini", "gpt-4-turbo"],
  anthropic: ["claude-3-7-sonnet-20250219", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022"],
  groq: ["llama-3.3-70b-versatile", "deepseek-r1-distill-llama-70b", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
  custom_openai: ["llama3.3", "deepseek-r1", "mistral-large", "qwen2.5-72b"],
};

export interface MeetingTemplateInfo {
  id: MeetingTemplateType;
  label: string;
  shortLabel: string;
  icon: string; // emoji or identifier
  description: string;
  highlights: string[];
}

export const MEETING_TEMPLATES: MeetingTemplateInfo[] = [
  {
    id: "general",
    label: "Reunião Geral & Ata Executiva",
    shortLabel: "Ata Geral",
    icon: "📋",
    description: "Ideal para qualquer reunião de equipe, alinhamentos, diretorias ou assembleias. Gera resumo executivo, ata formal, deliberações e tarefas.",
    highlights: ["Resumo Executivo", "Ata Formal de Reunião", "Decisões Tomadas", "Plano de Ação com Responsáveis"],
  },
  {
    id: "software_requirements",
    label: "Engenharia & Requisitos de Software",
    shortLabel: "Requisitos de Software",
    icon: "⚙️",
    description: "Ideal para reuniões de TI, discovery de produto, sprints e alinhamento com clientes e arquitetos de software.",
    highlights: ["Requisitos Funcionais (RF)", "Requisitos Não-Funcionais (RNF)", "Regras de Negócio", "User Stories (Gherkin BDD)"],
  },
  {
    id: "one_on_one",
    label: "1-on-1, Feedback & Gestão",
    shortLabel: "1-on-1 & Feedback",
    icon: "🤝",
    description: "Ideal para reuniões individuais de liderança, feedback, plano de desenvolvimento individual (PDI) e alinhamento de carreira.",
    highlights: ["Tópicos Pessoais & Carreira", "Feedbacks Construtivos", "Bloqueios & Apoio Necessário", "Combinados & Metas"],
  },
  {
    id: "brainstorming",
    label: "Brainstorming & Ideação",
    shortLabel: "Brainstorming",
    icon: "💡",
    description: "Ideal para dinâmicas criativas, planejamento de novos produtos, ideação em equipe e resolução de problemas.",
    highlights: ["Catálogo de Ideias", "Matriz Impacto vs Esforço", "Decisões de Priorização", "Próximos Experimentos"],
  },
  {
    id: "sales_discovery",
    label: "Vendas & Discovery Comercial",
    shortLabel: "Vendas & Discovery",
    icon: "💼",
    description: "Ideal para reuniões com clientes, reuniões de fechamento, briefing comercial e qualificação de leads.",
    highlights: ["Dores & Necessidades do Cliente", "Orçamento & Prazos Citados", "Objeções Mencionadas", "Próximos Passos da Proposta"],
  },
  {
    id: "training_class",
    label: "Aula, Treinamento & Estudo",
    shortLabel: "Aula & Treinamento",
    icon: "🎓",
    description: "Ideal para webinars, aulas, workshops técnicos, treinamentos corporativos e palestras.",
    highlights: ["Resumo Pedagógico", "Conceitos Fundamentais", "Glossário Explicativo", "Perguntas com Gabarito & Flashcards"],
  },
];

export function getStoredAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_AI_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AI_SETTINGS,
      ...parsed,
    };
  } catch (err) {
    console.error("Erro ao carregar configurações de IA:", err);
    return DEFAULT_AI_SETTINGS;
  }
}

export function saveAISettings(settings: AISettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error("Erro ao salvar configurações de IA:", err);
  }
}
