import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Copy, Check, MessageSquare, RefreshCw } from "lucide-react";
import { MeetingRecord } from "../types";

interface MeetingChatViewProps {
  meeting: MeetingRecord;
  onUpdateMeeting: (updated: Partial<MeetingRecord>) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export const MeetingChatView: React.FC<MeetingChatViewProps> = ({
  meeting,
  onUpdateMeeting,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(
    meeting.chatHistory || [
      {
        id: "msg-welcome",
        role: "assistant",
        content: `Olá! Sou o Assistente Especialista da reunião **"${meeting.title}"**. Você pode me perguntar sobre qualquer detalhe conversado, pedir detalhamento de requisitos (RF, RNF), diagramas técnicos, especificações de APIs ou elaborar resumos para envio à diretoria.`,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      },
    ]
  );
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickPrompts = [
    "Quais são os principais requisitos de alto risco?",
    "Crie uma especificação técnica preliminar dos endpoints REST",
    "Escreva um e-mail formal com a ata da reunião",
    "Gere cenários de teste Gherkin para os requisitos identificados",
  ];

  const handleSendMessage = async (customText?: string) => {
    const text = customText || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat-meeting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          meetingContext: {
            title: meeting.title,
            executiveSummary: meeting.analysis?.executiveSummary,
            transcript: meeting.transcript,
            functionalRequirements: meeting.analysis?.functionalRequirements,
            businessRules: meeting.analysis?.businessRules,
            actionItems: meeting.analysis?.actionItems,
          },
          history: messages.slice(-5),
        }),
      });

      const data = await response.json();

      const aiReply: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: "assistant",
        content: data.reply || data.error || "Não foi possível obter resposta da IA.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };

      const finalMessages = [...newMessages, aiReply];
      setMessages(finalMessages);
      onUpdateMeeting({ chatHistory: finalMessages });
    } catch (err: any) {
      console.error("Erro no chat:", err);
      const errorReply: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content: "Ocorreu um erro ao comunicar com a IA. Verifique sua conexão.",
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages([...newMessages, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-[#14161B] border border-[#22252D] rounded-xl flex flex-col h-[600px] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#22252D] flex items-center justify-between bg-[#14161B]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-400">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Assistente de IA da Reunião
            </h3>
            <p className="text-[10px] text-[#8E929E]">Powered by Gemini 3.7 Flash</p>
          </div>
        </div>

        <button
          onClick={() => {
            const initial: ChatMessage[] = [
              {
                id: `msg-welcome-${Date.now()}`,
                role: "assistant",
                content: `Conversa reiniciada. Como posso ajudar com a reunião "${meeting.title}"?`,
                timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
              },
            ];
            setMessages(initial);
            onUpdateMeeting({ chatHistory: initial });
          }}
          className="text-xs text-[#8E929E] hover:text-white flex items-center gap-1 px-2 py-1 rounded-md bg-[#1C1F26] border border-[#2A2D35] transition cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Limpar</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs leading-relaxed">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-6 h-6 rounded-md bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}

            <div
              className={`max-w-xl p-3 rounded-xl space-y-1 shadow-sm relative group ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-tr-xs"
                  : "bg-[#0E1015] border border-[#22252D] text-[#EDEDED] rounded-tl-xs"
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-[10px] opacity-70">
                <span className="font-bold">{msg.role === "user" ? "Você" : "Assistente IA"}</span>
                <span>{msg.timestamp}</span>
              </div>

              <div className="whitespace-pre-wrap font-sans leading-relaxed text-xs">{msg.content}</div>

              {msg.role === "assistant" && (
                <button
                  onClick={() => handleCopy(msg.id, msg.content)}
                  className="opacity-0 group-hover:opacity-100 transition absolute top-2 right-2 p-1 rounded bg-[#1C1F26] text-[#8E929E] hover:text-white border border-[#2A2D35]"
                  title="Copiar mensagem"
                >
                  {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-md bg-[#1C1F26] border border-[#2A2D35] flex items-center justify-center text-[#EDEDED] shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-blue-400 animate-pulse p-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistente analisando o contexto da reunião e formulando resposta...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts */}
      <div className="px-3 py-2 bg-[#0E1015] border-t border-[#22252D] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] text-[#8E929E] uppercase font-bold shrink-0">Sugestões:</span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] hover:text-white border border-[#2A2D35] whitespace-nowrap transition shrink-0 cursor-pointer"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input row */}
      <div className="p-2.5 border-t border-[#22252D] bg-[#14161B] flex gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Pergunte sobre requisitos, regras de negócio ou peça um resumo técnico..."
          disabled={isLoading}
          className="flex-1 bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg px-3 py-2 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none disabled:opacity-50"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!inputMessage.trim() || isLoading}
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-[#1C1F26] disabled:text-[#6B7280] text-white font-bold text-xs shadow-md shadow-blue-600/30 transition flex items-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Enviar</span>
        </button>
      </div>
    </div>
  );
};
