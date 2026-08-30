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

// Server-side Gemini AI client
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY não configurada no ambiente.");
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

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Transcription and Concise Key Points Summary Endpoint
app.post("/api/transcribe-and-summarize", async (req, res) => {
  try {
    const { transcript, audioBase64, mimeType, meetingTitle, duration, offlineNotes, tags } = req.body;

    if (!transcript && !audioBase64) {
      return res.status(400).json({ error: "É necessário fornecer a transcrição ou o áudio gravado." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `Você é um especialista em Processamento de Linguagem Natural, Transcrição de Áudio de Reuniões e Síntese Executiva.
Sua tarefa é transcrever o áudio fornecido com timestamps precisos e gerar um resumo conciso e de alto valor dos pontos centrais discutidos na reunião.

Retorne estritamente um JSON estruturado com a seguinte forma:
{
  "transcription": "Texto integral da transcrição limpa e coesa.",
  "transcriptSegments": [
    {
      "id": "seg-1",
      "startTime": 0,
      "endTime": 12,
      "timeFormatted": "00:00",
      "speaker": "Participante 1",
      "text": "Frase falada neste intervalo de tempo..."
    }
  ],
  "conciseSummary": "Resumo executivo e conciso com os objetivos principais, debates e decisões da reunião em 2 a 3 parágrafos diretos.",
  "keyDiscussionPoints": [
    "Ponto 1 discutido detalhando a decisão tomada",
    "Ponto 2 com resolução técnica ou de processo",
    "Ponto 3..."
  ],
  "keyKeywords": [
    { "keyword": "Palavra-Chave", "timeFormatted": "01:20", "context": "Breve contexto em que foi citada" }
  ],
  "actionItems": [
    { "id": "act-1", "task": "Tarefa ou compromisso assumido", "assignee": "Responsável", "completed": false }
  ]
}`;

    let contentsPayload: any;

    if (audioBase64 && audioBase64.length > 50) {
      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
      contentsPayload = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "audio/mp3",
              data: cleanBase64,
            },
          },
          {
            text: `Transcreva este áudio de reunião intitulada "${meetingTitle || "Reunião"}" (Duração aproximada: ${duration || "N/A"}).
${transcript ? `Transcrição preliminar capturada offline: """${transcript}"""` : ""}
${offlineNotes ? `Anotações rápidas feitas durante a gravação: """${offlineNotes}"""` : ""}
${tags && tags.length ? `Tags contextuais: ${tags.join(", ")}` : ""}

Gere a transcrição com segmentos temporais (timecodes) e o resumo conciso dos pontos discutidos em JSON estruturado.`,
          },
        ],
      };
    } else {
      contentsPayload = `Reunião: "${meetingTitle || "Reunião de Alinhamento"}"
Duração: ${duration || "N/A"}
Transcrição registrada:
"""
${transcript}
"""
${offlineNotes ? `Anotações: """${offlineNotes}"""` : ""}
${tags && tags.length ? `Tags: ${tags.join(", ")}` : ""}

Organize o texto em segmentos com timecodes calculados ao longo da duração, e elabore o resumo conciso dos pontos discutidos e tópicos-chave.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsedData = JSON.parse(text);

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Erro na transcrição e sumarização com Gemini:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Ocorreu um erro ao transcrever e resumir a reunião.",
    });
  }
});

// Full AI Analysis & Requirements Extraction Endpoint
app.post("/api/analyze-meeting", async (req, res) => {
  try {
    const { transcript, audioBase64, mimeType, meetingTitle, duration, offlineNotes, tags } = req.body;

    if (!transcript && !audioBase64) {
      return res.status(400).json({ error: "É necessário fornecer a transcrição ou o áudio gravado." });
    }

    const ai = getGeminiClient();

    const systemPrompt = `Você é um Engenheiro de Software Sênior, Analista de Requisitos e Especialista em Gestão de Projetos especializado em reuniões corporativas no ecossistema Windows / Enterprise.
Sua tarefa é analisar o registro da reunião fornecido (áudio e/ou transcrição) e gerar uma análise completa, altamente técnica, precisa e estruturada em formato JSON válido.

Você deve extrair:
1. "transcription": Transcrição polida e organizada.
2. "transcriptSegments": Array de objetos com { "id": "seg-N", "startTime": number, "endTime": number, "timeFormatted": "MM:SS", "speaker": "...", "text": "..." }.
3. "executiveSummary": Resumo executivo dos objetivos e conclusões da reunião.
4. "conciseSummary": Resumo conciso dos pontos centrais debatidos.
5. "keyDiscussionPoints": Lista de pontos-chave e deliberações mais importantes.
6. "keyPoints": Lista de tópicos centrais.
7. "functionalRequirements": Lista de Requisitos Funcionais (código RF01, RF02..., título, descrição detalhada, prioridade: "Alta"|"Média"|"Baixa", complexidade estimada: "P"|"M"|"G", trecho citado).
8. "nonFunctionalRequirements": Lista de Requisitos Não-Funcionais (código RNF01..., categoria: "Performance"|"Segurança"|"Usabilidade"|"Compatibilidade"|"Disponibilidade", descrição, critério de conformidade).
9. "businessRules": Lista de Regras de Negócio (código RN01..., regra estrita, impacto no negócio).
10. "userStories": Lista de Histórias de Usuário completas (formato "Como [papel], quero [ação], para que [benefício]", critérios de aceitação em formato Gherkin "Dado... Quando... Então...").
11. "actionItems": Tarefas acionáveis identificadas (tarefa, responsável provável/sugerido, prazo/urgência, status inicial: "Pendente").
12. "studyGuide": Material de Estudo e Aprendizado pós-reunião contendo:
   - "coreConcepts": Conceitos técnicos ou de negócio discutidos.
   - "flashcards": Array de objetos com "front" (pergunta ou termo) e "back" (resposta ou definição explicativa).
   - "reviewQuestions": 3 a 5 perguntas de revisão reflexiva com gabarito explicativo.
   - "glossary": Termos técnicos, acrônimos ou jargões mencionados com explicação simples.

Retorne SEMPRE estritamente um JSON estruturado seguindo essas chaves sem markdown envolvente.`;

    let contentsPayload: any;

    if (audioBase64 && audioBase64.length > 50) {
      const parts: any[] = [];
      const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: mimeType || "audio/mp3",
          data: cleanBase64,
        },
      });
      parts.push({
        text: `Por favor, escute este áudio da reunião intitulada "${meetingTitle || "Reunião de Alinhamento"}" (Duração: ${duration || "N/A"}).
${transcript ? `Transcrição preliminar capturada offline: """${transcript}"""` : ""}
${offlineNotes ? `Anotações rápidas do usuário durante a reunião: """${offlineNotes}"""` : ""}
${tags && tags.length ? `Tags contextuais: ${tags.join(", ")}` : ""}

Gere a análise completa, transcrição segmentada com timecodes e levantamento de requisitos em formato JSON estruturado.`,
      });
      contentsPayload = { parts };
    } else {
      contentsPayload = `Reunião: "${meetingTitle || "Reunião de Requisitos"}"
Duração aproximada: ${duration || "N/A"}
Transcrição registrada:
"""
${transcript}
"""
${offlineNotes ? `Anotações tomadas durante a reunião: """${offlineNotes}"""` : ""}
${tags && tags.length ? `Tags contextuais: ${tags.join(", ")}` : ""}

Analise detalhadamente o conteúdo acima e retorne o JSON com a transcrição segmentada por timecodes, resumo conciso, requisitos funcionais (RF), requisitos não-funcionais (RNF), regras de negócio (RN), histórias de usuário com critérios Gherkin, tarefas (action items) e guia de estudos com flashcards.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: contentsPayload,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsedData = JSON.parse(text);

    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Erro na análise da reunião com Gemini:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Ocorreu um erro ao processar a reunião com a IA.",
    });
  }
});

// Interactive Q&A / Meeting Assistant Endpoint
app.post("/api/chat-meeting", async (req, res) => {
  try {
    const { message, meetingContext, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem obrigatória." });
    }

    const ai = getGeminiClient();

    const systemInstruction = `Você é o Assistente Especialista da Reunião.
Você tem acesso a todos os detalhes da reunião abaixo (transcrição, requisitos, decisões, participantes).
Seu objetivo é responder a perguntas do usuário com precisão cirúrgica, citar trechos da reunião quando aplicável, sugerir especificações técnicas (como APIs, diagramas Mermaid, critérios de teste, modelagem de banco de dados) e apoiar nos estudos e levantamento de requisitos.

CONTEXTO DA REUNIÃO:
Título: ${meetingContext?.title || "Reunião"}
Resumo: ${meetingContext?.executiveSummary || "N/A"}
Transcrição/Notas: ${meetingContext?.transcript || "N/A"}
Requisitos identificados: ${JSON.stringify(meetingContext?.functionalRequirements || [])}
Regras de Negócio: ${JSON.stringify(meetingContext?.businessRules || [])}
Tarefas: ${JSON.stringify(meetingContext?.actionItems || [])}`;

    const promptMessages = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        promptMessages.push(`${h.role === "user" ? "Usuário" : "Assistente"}: ${h.content}`);
      }
    }
    promptMessages.push(`Usuário: ${message}`);

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: promptMessages.join("\n\n"),
      config: {
        systemInstruction,
      },
    });

    return res.json({
      success: true,
      reply: response.text || "Não foi possível gerar a resposta.",
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
    const { rawText, type } = req.body;
    const ai = getGeminiClient();

    const prompt = `Converta o seguinte texto bruto em ${type || "especificação formal de requisitos de software (RF, RNF, Histórias de Usuário e Regras de Negócio)"}:
"""
${rawText}
"""
Responda em formato Markdown estruturado, pronto para documentação de software e conformidade de engenharia de software.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
    });

    return res.json({ success: true, markdown: response.text });
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
