import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "60mb" }));
app.use(express.urlencoded({ extended: true, limit: "60mb" }));

// Helper to get Gemini Client with custom or default key
function getGeminiClient(customApiKey?: string) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Chave da API Gemini não encontrada. Configure sua chave nas configurações ou no ambiente.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Universal AI Caller supporting Gemini, OpenAI, Anthropic, Groq, and Ollama/Custom
interface CallAIOptions {
  provider?: string;
  apiKey?: string;
  model?: string;
  customBaseUrl?: string;
  systemInstruction: string;
  prompt: string;
  audioBase64?: string;
  mimeType?: string;
  responseJson?: boolean;
}

async function executeAIRequest(options: CallAIOptions): Promise<string> {
  const provider = options.provider || "gemini_server";
  const model = options.model || (provider.startsWith("gemini") ? "gemini-2.5-flash" : "gpt-4o");

  // 1. Google Gemini (Server or Custom Key)
  if (provider === "gemini_server" || provider === "gemini_custom") {
    const ai = getGeminiClient(options.apiKey);
    let contentsPayload: any;

    if (options.audioBase64 && options.audioBase64.length > 50) {
      const cleanBase64 = options.audioBase64.replace(/^data:[^;]+;base64,/, "");
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: options.mimeType || "audio/mp3",
              data: cleanBase64,
            },
          },
          { text: options.prompt },
        ],
      };
    } else {
      contentsPayload = options.prompt;
    }

    const response = await ai.models.generateContent({
      model: model || "gemini-2.5-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: options.systemInstruction,
        responseMimeType: options.responseJson ? "application/json" : undefined,
      },
    });

    return response.text || "{}";
  }

  // 2. OpenAI, Groq, or Custom OpenAI-Compatible (Ollama, Together, etc.)
  if (provider === "openai" || provider === "groq" || provider === "custom_openai") {
    let baseUrl = "https://api.openai.com/v1";
    if (provider === "groq") baseUrl = "https://api.groq.com/openai/v1";
    if (provider === "custom_openai") baseUrl = options.customBaseUrl || "http://localhost:11434/v1";

    const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
    const apiKey = options.apiKey || (provider === "openai" ? process.env.OPENAI_API_KEY : "");

    const messages = [
      { role: "system", content: options.systemInstruction },
      { role: "user", content: options.prompt },
    ];

    const bodyPayload: any = {
      model: model,
      messages: messages,
      temperature: 0.2,
    };

    if (options.responseJson) {
      bodyPayload.response_format = { type: "json_object" };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${cleanBaseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro na API (${provider} - ${res.status}): ${errText}`);
    }

    const jsonRes: any = await res.json();
    return jsonRes.choices?.[0]?.message?.content || "{}";
  }

  // 3. Anthropic Claude
  if (provider === "anthropic") {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("Chave da API da Anthropic obrigatória.");
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-3-7-sonnet-20250219",
        max_tokens: 4096,
        system: options.systemInstruction,
        messages: [{ role: "user", content: options.prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro na API da Anthropic (${res.status}): ${errText}`);
    }

    const jsonRes: any = await res.json();
    return jsonRes.content?.[0]?.text || "{}";
  }

  throw new Error(`Provedor de IA desconhecido: ${provider}`);
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Fetch Active Models endpoint for any provider
app.post("/api/list-ai-models", async (req, res) => {
  try {
    const { provider, apiKey, customBaseUrl } = req.body;

    if (provider === "gemini_server" || provider === "gemini_custom") {
      const activeList = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-3.7-flash",
      ];
      try {
        const keyToUse = provider === "gemini_custom" ? apiKey : process.env.GEMINI_API_KEY;
        if (keyToUse) {
          const ai = getGeminiClient(keyToUse);
          const response = await ai.models.list();
          const fetchedNames: string[] = [];
          for await (const m of response) {
            if (m.name && m.name.includes("gemini")) {
              fetchedNames.push(m.name.replace("models/", ""));
            }
          }
          if (fetchedNames.length > 0) {
            return res.json({ success: true, models: fetchedNames });
          }
        }
      } catch (err) {
        console.warn("Could not list live gemini models, returning default list:", err);
      }
      return res.json({ success: true, models: activeList });
    }

    if (provider === "openai") {
      const keyToUse = apiKey || process.env.OPENAI_API_KEY;
      if (!keyToUse) {
        return res.json({
          success: true,
          models: ["gpt-4o", "gpt-4o-mini", "o3-mini", "o1-mini", "gpt-4-turbo"],
        });
      }
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${keyToUse}` },
      });
      if (!response.ok) {
        throw new Error(`OpenAI respondeu com erro ${response.status}`);
      }
      const data: any = await response.json();
      const models = (data.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => id.includes("gpt") || id.includes("o1") || id.includes("o3"))
        .sort();
      return res.json({ success: true, models: models.length ? models : ["gpt-4o", "gpt-4o-mini", "o3-mini"] });
    }

    if (provider === "groq") {
      const keyToUse = apiKey || process.env.GROQ_API_KEY;
      if (!keyToUse) {
        return res.json({
          success: true,
          models: [
            "llama-3.3-70b-versatile",
            "deepseek-r1-distill-llama-70b",
            "llama-3.1-8b-instant",
            "mixtral-8x7b-32768",
          ],
        });
      }
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${keyToUse}` },
      });
      if (!response.ok) {
        throw new Error(`Groq respondeu com status ${response.status}`);
      }
      const data: any = await response.json();
      const models = (data.data || []).map((m: any) => m.id).sort();
      return res.json({ success: true, models });
    }

    if (provider === "anthropic") {
      return res.json({
        success: true,
        models: [
          "claude-3-7-sonnet-20250219",
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-opus-20240229",
        ],
      });
    }

    if (provider === "custom_openai") {
      const baseUrl = (customBaseUrl || "http://localhost:11434/v1").replace(/\/+$/, "");
      try {
        const response = await fetch(`${baseUrl}/models`, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        });
        if (response.ok) {
          const data: any = await response.json();
          const models = (data.data || []).map((m: any) => m.id || m.name).sort();
          if (models.length > 0) {
            return res.json({ success: true, models });
          }
        }
      } catch (err) {
        console.warn("Could not query custom endpoint models:", err);
      }
      return res.json({
        success: true,
        models: ["llama3.3", "deepseek-r1", "mistral-large", "qwen2.5-72b"],
      });
    }

    return res.json({ success: true, models: ["gemini-2.5-flash", "gpt-4o"] });
  } catch (error: any) {
    console.error("Erro ao buscar modelos:", error);
    return res.status(500).json({ success: false, error: error.message || "Erro ao listar modelos da IA." });
  }
});

// Dynamic System Prompt Builder according to Meeting Template with Advanced Speaker Diarization
function buildAnalysisSystemPrompt(template: string = "general"): string {
  let templateInstructions = "";

  if (template === "general") {
    templateInstructions = `
FOCO: REUNIÃO GERAL & ATA EXECUTIVA FORMAL
- "formalMinutes": Elabore uma Ata Formal de Reunião completa e executiva (contendo: 1. Abertura e Objetivo, 2. Pauta e Assuntos Discutidos, 3. Deliberações e Decisões Aprovadas, 4. Próximos Passos e Responsabilidades).
- "decisions": Lista de todas as decisões e deliberações firmadas.
- "conciseSummary": Resumo executivo claro em 2 a 3 parágrafos.
- "actionItems": Tarefas distribuídas com responsável e prazo.`;
  } else if (template === "software_requirements") {
    templateInstructions = `
FOCO: ENGENHARIA DE SOFTWARE & ESPECIFICAÇÃO DE REQUISITOS
- "functionalRequirements": Requisitos Funcionais estruturados (código RF01..., título, descrição, prioridade: "Alta"|"Média"|"Baixa", complexidade: "P"|"M"|"G").
- "nonFunctionalRequirements": Requisitos Não-Funcionais (código RNF01..., categoria: "Performance"|"Segurança"|"Usabilidade"|"Arquitetura", critérios de conformidade).
- "businessRules": Regras de Negócio estritas (RN01...).
- "userStories": Histórias de Usuário completas com critérios de aceitação em formato Gherkin BDD (Dado... Quando... Então...).`;
  } else if (template === "one_on_one") {
    templateInstructions = `
FOCO: 1-ON-1, FEEDBACK E GESTÃO DE PESSOAS
- "oneOnOne": Objeto com:
  - "topicsDiscussed": Tópicos pessoais, de rotina e projetos alinhados.
  - "feedbackGiven": Feedbacks positivos e oportunidades de melhoria mencionadas.
  - "careerAndGrowth": Metas de evolução, carreira e aprendizado.
  - "blockersAndSupport": Dores, impedimentos e suporte que o líder/empresa precisa prestar.
  - "agreements": Combinados, metas e pactos para o próximo ciclo.`;
  } else if (template === "brainstorming") {
    templateInstructions = `
FOCO: BRAINSTORMING, IDEAÇÃO & RESOLUÇÃO DE PROBLEMAS
- "ideas": Lista de ideias levantadas no formato [{ "id": "idea-1", "title": "...", "description": "...", "category": "...", "impactEffort": "Alto Impacto / Baixo Esforço"|"Alto Impacto / Alto Esforço"|"Baixo Impacto / Baixo Esforço"|"Baixo Impacto / Alto Esforço", "status": "Aprovada"|"Para Avaliação"|"Descartada" }].
- "decisions": Decisões sobre quais ideias serão prototipadas ou exploradas primeiro.`;
  } else if (template === "sales_discovery") {
    templateInstructions = `
FOCO: VENDAS, BRIEFING & DISCOVERY COMERCIAL
- "salesInsights": Objeto com:
  - "clientNeeds": Dores centrais e necessidades explícitas do cliente/prospect.
  - "budgetNotes": Valores, orçamento disponível ou restrições financeiras citadas.
  - "keyStakeholders": Tomadores de decisão e influenciadores citados.
  - "objectionsRaised": Objeções e preocupações levantadas pelo cliente.
  - "nextStepsAgreed": Próximos passos acordados para envio de proposta ou fechamento.`;
  } else if (template === "training_class") {
    templateInstructions = `
FOCO: AULA, TREINAMENTO & ESTUDO
- "studyGuide": Objeto com:
  - "coreConcepts": Lista de conceitos fundamentais ensinados.
  - "flashcards": Array de { "id": "fc-1", "front": "Pergunta ou conceito", "back": "Resposta clara" }.
  - "reviewQuestions": Array de { "id": "rq-1", "question": "...", "answer": "...", "explanation": "..." }.
  - "glossary": Array de { "term": "...", "definition": "..." }.`;
  }

  return `Você é um Especialista Sênior em Inteligência de Reuniões Corporativas, Diarização de Áudio Multimodal e Engenharia de Requisitos.
Sua missão é processar a gravação/transcrição da reunião e gerar uma análise completa, precisa e estruturada em JSON válido.

DIRETRIZES FUNDAMENTAIS DE IDENTIFICAÇÃO DE FALAS (SPEAKER DIARIZATION):
1. SEPARAÇÃO DE CANAIS DE ÁUDIO:
   - Se o áudio gravado utilizar 'dual_channels' (Separação Estéreo):
     * O Canal Esquerdo (L / Ch 0) corresponde ao Microfone Local (Anfitrião / Você).
     * O Canal Direito (R / Ch 1) corresponde ao Áudio do Google Meet / Zoom / Sistema (Participantes Remotos).
   - Use essa separação física para distinguir com 100% de clareza quando o anfitrião está falando versus quando um colega remoto está falando.

2. MAPEAMENTO DE NOMES DOS PARTICIPANTES:
   - Verifique a lista de "Participantes" fornecida no prompt.
   - Analise pistas contextuais da conversa (cumprimentos como "Bom dia Alexandre", referências a "Conforme a Mariana pontuou", transferências de palavra como "Carlos, você pode assumir essa parte?").
   - Associe as vozes aos nomes reais dos participantes em "transcriptSegments" (campo "speaker"). Se não tiver certeza absoluta de um nome específico, use o rótulo mais informativo (ex: "Alexandre", "Beatriz", ou "Participante Remoto 1").

3. CRUZAMENTO COM ANOTAÇÕES & LEGENDAS:
   - Utilize as "Anotações Rápidas" e "Legendas / Closed Captions" fornecidas para desempatar termos técnicos, nomes próprios, deliberações e responsáveis pelas tarefas.

4. ESTATÍSTICAS DE FALA ("speakerStats"):
   - Calcule a distribuição estimada de tempo de fala para cada participante identificado.

${templateInstructions}

Retorne SEMPRE estritamente um JSON estruturado com a seguinte estrutura geral (populando com excelência os campos relevantes ao template):
{
  "transcription": "Texto integral e limpo da transcrição com identificação dos locutores",
  "transcriptSegments": [
    {
      "id": "seg-1",
      "startTime": 0,
      "endTime": 15,
      "timeFormatted": "00:00",
      "speaker": "Nome do Participante",
      "channel": "mic" | "system" | "mixed",
      "text": "Frase dita pelo participante neste intervalo de tempo..."
    }
  ],
  "participants": ["Nome 1 (Cargo/Papel)", "Nome 2"],
  "speakerStats": [
    {
      "speaker": "Nome do Participante",
      "segmentCount": 8,
      "estimatedSeconds": 140,
      "percentage": 45
    }
  ],
  "executiveSummary": "Resumo executivo completo",
  "conciseSummary": "Resumo conciso dos pontos centrais debatidos",
  "formalMinutes": "Texto da Ata Formal da reunião (se aplicável)",
  "keyDiscussionPoints": ["Ponto 1", "Ponto 2"],
  "keyPoints": ["Tópico 1", "Tópico 2"],
  "decisions": ["Decisão 1", "Decisão 2"],
  "functionalRequirements": [
    { "id": "RF01", "title": "...", "description": "...", "priority": "Alta", "complexity": "M", "sourceQuote": "..." }
  ],
  "nonFunctionalRequirements": [
    { "id": "RNF01", "category": "Performance", "description": "...", "complianceCriteria": "..." }
  ],
  "businessRules": [
    { "id": "RN01", "rule": "...", "impact": "..." }
  ],
  "userStories": [
    { "id": "US01", "role": "...", "action": "...", "benefit": "...", "gherkin": "Dado... Quando... Então..." }
  ],
  "actionItems": [
    { "id": "act-1", "task": "...", "assignee": "...", "deadline": "...", "completed": false, "priority": "Alta" }
  ],
  "studyGuide": {
    "coreConcepts": ["..."],
    "flashcards": [{ "id": "fc-1", "front": "...", "back": "..." }],
    "reviewQuestions": [{ "id": "rq-1", "question": "...", "answer": "...", "explanation": "..." }],
    "glossary": [{ "term": "...", "definition": "..." }]
  },
  "ideas": [
    { "id": "id-1", "title": "...", "description": "...", "category": "...", "impactEffort": "Alto Impacto / Baixo Esforço", "status": "Aprovada" }
  ],
  "oneOnOne": {
    "topicsDiscussed": ["..."],
    "feedbackGiven": ["..."],
    "careerAndGrowth": ["..."],
    "blockersAndSupport": ["..."],
    "agreements": ["..."]
  },
  "salesInsights": {
    "clientNeeds": ["..."],
    "budgetNotes": "...",
    "keyStakeholders": ["..."],
    "objectionsRaised": ["..."],
    "nextStepsAgreed": ["..."]
  }
}`;
}

// AI Transcription and Concise Key Points Summary Endpoint
app.post("/api/transcribe-and-summarize", async (req, res) => {
  try {
    const {
      transcript,
      audioBase64,
      mimeType,
      meetingTitle,
      duration,
      participants,
      sourceType = "dual_channels",
      offlineNotes,
      closedCaptionsContext,
      tags,
      template = "general",
      aiSettings,
    } = req.body;

    if (!transcript && !audioBase64) {
      return res.status(400).json({ error: "É necessário fornecer a transcrição ou o áudio gravado." });
    }

    const systemPrompt = `Você é um assistente executivo especializado em síntese de reuniões corporativas e diarização de locutores.
Template da reunião: ${template.toUpperCase()}
Sua tarefa é transcrever o áudio fornecido com timestamps precisos, identificar os locutores (usando nomes reais quando informados ou inferíveis pelo contexto) e gerar um resumo conciso de alto valor adaptado ao template '${template}'.

Retorne estritamente um JSON estruturado com o formato:
{
  "transcription": "Texto integral da transcrição limpa com nomes dos locutores.",
  "transcriptSegments": [
    {
      "id": "seg-1",
      "startTime": 0,
      "endTime": 12,
      "timeFormatted": "00:00",
      "speaker": "Nome do Participante",
      "channel": "mic" | "system" | "mixed",
      "text": "Frase falada neste intervalo de tempo..."
    }
  ],
  "participants": ["Participante 1", "Participante 2"],
  "speakerStats": [
    { "speaker": "Nome", "segmentCount": 5, "estimatedSeconds": 80, "percentage": 50 }
  ],
  "conciseSummary": "Resumo conciso dos pontos centrais em 2 a 3 parágrafos diretos.",
  "formalMinutes": "Ata resumida da reunião com abertura, deliberações e encerramento.",
  "keyDiscussionPoints": ["Ponto 1...", "Ponto 2..."],
  "decisions": ["Decisão 1 tomada...", "Decisão 2..."],
  "actionItems": [
    { "id": "act-1", "task": "Tarefa identificada", "assignee": "Responsável", "deadline": "Prazo", "completed": false }
  ]
}`;

    const promptText = `Reunião: "${meetingTitle || "Reunião de Alinhamento"}"
Tipo/Template: ${template}
Duração aproximada: ${duration || "N/A"}
Modo de Captura de Áudio: ${sourceType === "dual_channels" ? "Separação de Canais Estéreo (L = Microfone do Anfitrião, R = Google Meet / Participantes Remotos)" : sourceType}
${participants && (Array.isArray(participants) ? participants.length : participants.trim()) ? `Relação de Participantes Informados: ${Array.isArray(participants) ? participants.join(", ") : participants}` : ""}
${transcript ? `Transcrição preliminar capturada offline: """${transcript}"""` : ""}
${offlineNotes ? `Anotações rápidas tomadas durante a reunião: """${offlineNotes}"""` : ""}
${closedCaptionsContext ? `Legendas do Google Meet / Closed Captions: """${closedCaptionsContext}"""` : ""}
${tags && tags.length ? `Tags: ${tags.join(", ")}` : ""}

Por favor, realize a transcrição com diarização de locutores (atribuindo os nomes corretos a cada fala), timecodes e o resumo conciso dos pontos discutidos em formato JSON válido.`;

    const rawResponse = await executeAIRequest({
      provider: aiSettings?.provider || "gemini_server",
      apiKey: aiSettings?.apiKey,
      model: aiSettings?.model,
      customBaseUrl: aiSettings?.customBaseUrl,
      systemInstruction: systemPrompt,
      prompt: promptText,
      audioBase64,
      mimeType,
      responseJson: true,
    });

    let parsedData: any = {};
    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn("Could not parse AI JSON output directly:", parseErr, rawResponse);
      parsedData = {
        conciseSummary: rawResponse,
        transcription: transcript || "",
        keyDiscussionPoints: [],
      };
    }

    parsedData.template = template;
    parsedData.providerUsed = aiSettings?.provider || "gemini_server";
    parsedData.modelUsed = aiSettings?.model || "padrão";

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Erro na transcrição e sumarização:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Ocorreu um erro ao transcrever e resumir a reunião.",
    });
  }
});

// Full AI Analysis with Template & Multi-Provider Support
app.post("/api/analyze-meeting", async (req, res) => {
  try {
    const {
      transcript,
      audioBase64,
      mimeType,
      meetingTitle,
      duration,
      participants,
      sourceType = "dual_channels",
      offlineNotes,
      closedCaptionsContext,
      tags,
      template = "general",
      aiSettings,
    } = req.body;

    if (!transcript && !audioBase64) {
      return res.status(400).json({ error: "É necessário fornecer a transcrição ou o áudio gravado." });
    }

    const systemPrompt = buildAnalysisSystemPrompt(template);

    const promptText = `Reunião: "${meetingTitle || "Reunião de Alinhamento"}"
Template Selecionado: ${template}
Duração estimada: ${duration || "N/A"}
Modo de Áudio: ${sourceType === "dual_channels" ? "Separação de Canais Estéreo (Canal E/0 = Microfone do Anfitrião, Canal D/1 = Google Meet / Áudio Remoto)" : sourceType}
${participants && (Array.isArray(participants) ? participants.length : participants.trim()) ? `Participantes da Reunião: ${Array.isArray(participants) ? participants.join(", ") : participants}` : ""}
${transcript ? `Transcrição registrada: """${transcript}"""` : ""}
${offlineNotes ? `Anotações tomadas durante a reunião (pauta, itens e observações): """${offlineNotes}"""` : ""}
${closedCaptionsContext ? `Legendas do Google Meet / Closed Captions copiadas: """${closedCaptionsContext}"""` : ""}
${tags && tags.length ? `Tags contextuais: ${tags.join(", ")}` : ""}

Analise detalhadamente o conteúdo desta reunião de acordo com o template '${template}'. Execute a diarização das falas associando as vozes e canais aos participantes reais, cruze com as anotações e retorne estritamente o JSON estruturado contendo a transcrição segmentada por locutor, resumo, ata/decisões, estatísticas de participação e requisitos específicos.`;

    const rawResponse = await executeAIRequest({
      provider: aiSettings?.provider || "gemini_server",
      apiKey: aiSettings?.apiKey,
      model: aiSettings?.model,
      customBaseUrl: aiSettings?.customBaseUrl,
      systemInstruction: systemPrompt,
      prompt: promptText,
      audioBase64,
      mimeType,
      responseJson: true,
    });

    let parsedData: any = {};
    try {
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedData = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.warn("Could not parse meeting analysis JSON directly:", parseErr, rawResponse);
      parsedData = {
        executiveSummary: rawResponse,
        conciseSummary: rawResponse,
        transcription: transcript || "",
      };
    }

    parsedData.template = template;
    parsedData.providerUsed = aiSettings?.provider || "gemini_server";
    parsedData.modelUsed = aiSettings?.model || "padrão";

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Erro na análise da reunião:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Ocorreu um erro ao processar a reunião com a IA.",
    });
  }
});

// Interactive Q&A / Meeting Assistant Endpoint with Multi-provider support
app.post("/api/chat-meeting", async (req, res) => {
  try {
    const { message, meetingContext, history, aiSettings } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem obrigatória." });
    }

    const systemInstruction = `Você é o Assistente Especialista da Reunião.
Você tem acesso a todos os detalhes da reunião abaixo (transcrição, requisitos, decisões, participantes).
Seu objetivo é responder a perguntas do usuário com precisão cirúrgica, citar trechos da reunião quando aplicável, sugerir especificações técnicas, planos de ação ou atas executivas.

CONTEXTO DA REUNIÃO:
Título: ${meetingContext?.title || "Reunião"}
Template: ${meetingContext?.template || "general"}
Resumo: ${meetingContext?.executiveSummary || meetingContext?.conciseSummary || "N/A"}
Transcrição/Notas: ${meetingContext?.transcript || "N/A"}
Decisões: ${JSON.stringify(meetingContext?.decisions || [])}
Requisitos identificados: ${JSON.stringify(meetingContext?.functionalRequirements || [])}
Regras de Negócio: ${JSON.stringify(meetingContext?.businessRules || [])}
Tarefas: ${JSON.stringify(meetingContext?.actionItems || [])}`;

    const promptMessages: string[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        promptMessages.push(`${h.role === "user" ? "Usuário" : "Assistente"}: ${h.content}`);
      }
    }
    promptMessages.push(`Usuário: ${message}`);

    const reply = await executeAIRequest({
      provider: aiSettings?.provider || "gemini_server",
      apiKey: aiSettings?.apiKey,
      model: aiSettings?.model,
      customBaseUrl: aiSettings?.customBaseUrl,
      systemInstruction,
      prompt: promptMessages.join("\n\n"),
      responseJson: false,
    });

    return res.json({
      success: true,
      reply: reply || "Não foi possível gerar a resposta.",
    });
  } catch (error: any) {
    console.error("Erro no chat da reunião:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erro ao consultar o assistente de reunião.",
    });
  }
});

// Quick AI Polish / Rephrase / Requirements Generator from partial text
app.post("/api/refine-requirements", async (req, res) => {
  try {
    const { rawText, type, aiSettings } = req.body;

    const prompt = `Converta o seguinte texto bruto em ${type || "especificação formal (Ata executiva ou requisitos de software)"}:
"""
${rawText}
"""
Responda em formato Markdown estruturado e limpo.`;

    const markdown = await executeAIRequest({
      provider: aiSettings?.provider || "gemini_server",
      apiKey: aiSettings?.apiKey,
      model: aiSettings?.model,
      customBaseUrl: aiSettings?.customBaseUrl,
      systemInstruction: "Você é um analista de redação técnica e executiva de reuniões.",
      prompt,
      responseJson: false,
    });

    return res.json({ success: true, markdown });
  } catch (error: any) {
    console.error("Erro ao refinar requisitos:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Erro ao refinar requisitos.",
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor Windows Meeting Audio & Requirements rodando em http://localhost:${PORT}`);
  });
}

startServer();
