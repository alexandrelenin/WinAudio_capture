import {
  MeetingAnalysisData,
  FunctionalRequirement,
  NonFunctionalRequirement,
  BusinessRule,
  UserStory,
  ActionItem,
  Flashcard,
  ReviewQuestion,
  GlossaryItem,
  AudioMarker,
} from "../types";

export function analyzeMeetingLocallyOffline(
  title: string,
  transcript: string,
  offlineNotes: string = "",
  markers: AudioMarker[] = []
): MeetingAnalysisData {
  const combinedText = `${transcript}\n${offlineNotes}`;
  const sentences = combinedText
    .split(/[.!?\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);

  const functionalRequirements: FunctionalRequirement[] = [];
  const nonFunctionalRequirements: NonFunctionalRequirement[] = [];
  const businessRules: BusinessRule[] = [];
  const actionItems: ActionItem[] = [];
  const keyPoints: string[] = [];

  let rfCount = 1;
  let rnfCount = 1;
  let rnCount = 1;
  let actCount = 1;

  // 1. Process explicit markers placed during the meeting
  markers.forEach((m) => {
    if (m.type === "requisito") {
      functionalRequirements.push({
        id: `RF${String(rfCount++).padStart(2, "0")}`,
        title: m.label || "Requisito Marcado na Reunião",
        description: m.note || m.label || "Definido durante o debate.",
        priority: "Alta",
        complexity: "M",
        sourceQuote: `Marcado no minuto ${m.timeFormatted}`,
        status: "Em Análise",
      });
    } else if (m.type === "tarefa") {
      actionItems.push({
        id: `ACT-${actCount++}`,
        task: m.label || "Ação identificada no áudio",
        deadline: "A definir",
        completed: false,
        priority: "Média",
      });
    } else if (m.type === "decisao") {
      keyPoints.push(`[Decisão @ ${m.timeFormatted}] ${m.label}: ${m.note || ""}`);
    }
  });

  // Heuristic patterns for Portuguese & English software requirements
  const reqKeywords = [
    /deve(m)?\s+([a-zA-Záéíóúãõç\s]+)/i,
    /precisa(mos)?\s+([a-zA-Záéíóúãõç\s]+)/i,
    /tem que\s+([a-zA-Záéíóúãõç\s]+)/i,
    /obrigat[óo]rio\s+([a-zA-Záéíóúãõç\s]+)/i,
    /o sistema (vai|deve|precisa)\s+([a-zA-Záéíóúãõç\s]+)/i,
    /o usu[áa]rio (pode|deve|precisa)\s+([a-zA-Záéíóúãõç\s]+)/i,
    /requisito[:\s]+([a-zA-Záéíóúãõç\s]+)/i,
  ];

  const nfrKeywords = [
    { pattern: /tempo de resposta|lat[êe]ncia|performance|desempenho|milissegundos|r[áa]pido/i, cat: "Performance" as const },
    { pattern: /seguran[çc]a|criptograf|token|jwt|lgpd|senha|autentica|permiss/i, cat: "Segurança" as const },
    { pattern: /usabilidade|interface|intuitiv|design|responsiv|dark mode|acessibilidade/i, cat: "Usabilidade" as const },
    { pattern: /windows|compatibilidade|vers[ãa]o|desktop|offline|local/i, cat: "Compatibilidade" as const },
    { pattern: /disponibilidade|uptime|backup|falha|recupera/i, cat: "Disponibilidade" as const },
  ];

  const rnKeywords = [
    /se o cliente|caso o usu[áa]rio|regra[:\s]|n[ãa]o [ée] permitido|limite de|taxa de|valida[çc][ãa]o/i,
  ];

  const actionKeywords = [
    /vai ficar com|respons[áa]vel|entregar at[ée]|fazer at[ée]|prazo|vou verificar|vou enviar|ficar de/i,
  ];

  sentences.forEach((sentence) => {
    // Check NFR
    let matchedNfr = false;
    for (const item of nfrKeywords) {
      if (item.pattern.test(sentence)) {
        if (!nonFunctionalRequirements.some((r) => r.description === sentence)) {
          nonFunctionalRequirements.push({
            id: `RNF${String(rnfCount++).padStart(2, "0")}`,
            category: item.cat,
            description: sentence,
            complianceCriteria: `Verificação e testes de ${item.cat.toLowerCase()} no ambiente Windows / Produção.`,
          });
        }
        matchedNfr = true;
        break;
      }
    }

    if (matchedNfr) return;

    // Check Business Rules
    if (rnKeywords.some((p) => p.test(sentence))) {
      if (!businessRules.some((b) => b.rule === sentence)) {
        businessRules.push({
          id: `RN${String(rnCount++).padStart(2, "0")}`,
          rule: sentence,
          impact: "Validação obrigatória no fluxo de negócio.",
        });
      }
      return;
    }

    // Check Action items
    if (actionKeywords.some((p) => p.test(sentence))) {
      if (!actionItems.some((a) => a.task === sentence)) {
        actionItems.push({
          id: `ACT-${actCount++}`,
          task: sentence,
          assignee: "Equipe / Participante",
          completed: false,
          priority: "Alta",
        });
      }
    }

    // Check Functional Requirements
    if (reqKeywords.some((p) => p.test(sentence))) {
      if (!functionalRequirements.some((f) => f.description === sentence)) {
        const words = sentence.split(" ");
        const shortTitle = words.slice(0, 6).join(" ") + (words.length > 6 ? "..." : "");
        functionalRequirements.push({
          id: `RF${String(rfCount++).padStart(2, "0")}`,
          title: shortTitle,
          description: sentence,
          priority: sentence.toLowerCase().includes("alta") || sentence.toLowerCase().includes("urgente") ? "Alta" : "Média",
          complexity: "M",
          sourceQuote: sentence,
          status: "Pendente",
        });
      }
    }
  });

  // Fallback defaults if few requirements were parsed heuristically
  if (functionalRequirements.length === 0 && sentences.length > 0) {
    functionalRequirements.push({
      id: "RF01",
      title: "Processamento e Registro Central da Reunião",
      description: sentences[0] || "O sistema deve registrar o conteúdo da reunião com fidelidade.",
      priority: "Alta",
      complexity: "M",
      sourceQuote: sentences[0] || "",
      status: "Pendente",
    });
  }

  // Generate User Stories
  const userStories: UserStory[] = functionalRequirements.slice(0, 6).map((rf, idx) => {
    return {
      id: `US-${String(idx + 1).padStart(2, "0")}`,
      role: "Usuário do Sistema / Stakeholder",
      action: `executar a funcionalidade "${rf.title}"`,
      benefit: "garantir o cumprimento dos objetivos discutidos na reunião",
      gherkin: `Cenário: Validação de ${rf.id}\nDado que o usuário está autenticado no ambiente de trabalho\nQuando solicita o processamento de "${rf.title}"\nEntão o sistema deve registrar a operação com sucesso em conformidade com ${rf.id}.`,
    };
  });

  // Executive summary
  const executiveSummary = `Reunião realizada com foco em "${title || "Alinhamento e Requisitos"}". Foram identificados ${functionalRequirements.length} requisitos funcionais, ${nonFunctionalRequirements.length} requisitos não-funcionais e ${actionItems.length} ações imediatas. O áudio e os registros foram armazenados localmente com total suporte offline.`;

  // Study Guide & Flashcards
  const flashcards: Flashcard[] = [
    {
      id: "FC-1",
      front: `Qual é o objetivo principal de "${title || "esta reunião"}"?`,
      back: executiveSummary,
    },
    ...functionalRequirements.slice(0, 4).map((rf, i) => ({
      id: `FC-${i + 2}`,
      front: `O que determina o requisito [${rf.id}] "${rf.title}"?`,
      back: `${rf.description} (Prioridade: ${rf.priority})`,
    })),
  ];

  const reviewQuestions: ReviewQuestion[] = [
    {
      id: "RQ-1",
      question: "Quais foram os principais requisitos de conformidade ou restrições técnicas levantados?",
      answer: nonFunctionalRequirements.length > 0
        ? nonFunctionalRequirements.map((r) => `${r.id} (${r.category}): ${r.description}`).join(" | ")
        : "Foram discutidas diretrizes de usabilidade, compatibilidade com Windows e confiabilidade offline.",
      explanation: "Requisitos não-funcionais asseguram que o sistema opere com a qualidade e segurança esperadas.",
    },
    {
      id: "RQ-2",
      question: "Quais são as próximas ações pendentes com maior urgência?",
      answer: actionItems.length > 0
        ? actionItems.map((a) => a.task).join("; ")
        : "Revisão dos pontos mapeados e aprovação final da ata pelos participantes.",
      explanation: "O acompanhamento das ações garante o progresso do projeto.",
    },
  ];

  const glossary: GlossaryItem[] = [
    { term: "RF (Requisito Funcional)", definition: "Declaração dos serviços que o sistema deve fornecer e como deve reagir a entradas específicas." },
    { term: "RNF (Requisito Não-Funcional)", definition: "Restrições aos serviços ou funções oferecidas pelo sistema (ex: desempenho, segurança, compatibilidade)." },
    { term: "Gherkin / BDD", definition: "Linguagem estruturada (Dado/Quando/Então) para descrever cenários de teste e critérios de aceitação." },
    { term: "MP3 Audio Pipeline", definition: "Codificação de áudio PCM de alta fidelidade em formato MP3 compactado compatível com Windows e players universais." },
  ];

  return {
    transcription: transcript || combinedText,
    executiveSummary,
    keyPoints: keyPoints.length > 0 ? keyPoints : [
      "Gravação e processamento realizados localmente no Windows.",
      `Identificados ${functionalRequirements.length} requisitos funcionais principais.`,
      "Dados persistidos em base de dados IndexedDB segura no navegador.",
    ],
    functionalRequirements,
    nonFunctionalRequirements,
    businessRules,
    userStories,
    actionItems,
    studyGuide: {
      coreConcepts: [
        "Engenharia de Requisitos",
        "Atas e Registro de Reuniões",
        "Processamento de Áudio Local",
        "Critérios de Aceitação Gherkin",
      ],
      flashcards,
      reviewQuestions,
      glossary,
    },
    generatedAt: new Date().toISOString(),
    mode: "offline",
  };
}
