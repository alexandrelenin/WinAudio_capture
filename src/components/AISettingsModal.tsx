import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  Key,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Zap,
  Shield,
  Layers,
  HelpCircle,
} from "lucide-react";
import { AISettings, AIProviderType, MeetingTemplateType } from "../types";
import {
  DEFAULT_AI_SETTINGS,
  PROVIDER_DEFAULT_MODELS,
  MEETING_TEMPLATES,
  getStoredAISettings,
  saveAISettings,
} from "../utils/aiSettings";

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: (settings: AISettings) => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved,
}) => {
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<{
    type: "idle" | "success" | "error";
    message: string;
    modelCount?: number;
  }>({ type: "idle", message: "" });

  useEffect(() => {
    if (isOpen) {
      const current = getStoredAISettings();
      setSettings(current);
      setAvailableModels(PROVIDER_DEFAULT_MODELS[current.provider] || []);
      setTestStatus({ type: "idle", message: "" });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: AIProviderType) => {
    const defaults = PROVIDER_DEFAULT_MODELS[newProvider] || [];
    const newModel = defaults[0] || "gemini-2.5-flash";
    setSettings((prev) => ({
      ...prev,
      provider: newProvider,
      model: newModel,
    }));
    setAvailableModels(defaults);
    setTestStatus({ type: "idle", message: "" });
  };

  const handleFetchActiveModels = async () => {
    setIsLoadingModels(true);
    setTestStatus({ type: "idle", message: "Consultando API de modelos ativos..." });

    try {
      const res = await fetch("/api/list-ai-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: settings.provider,
          apiKey: settings.apiKey,
          customBaseUrl: settings.customBaseUrl,
        }),
      });

      const data = await res.json();

      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
        if (!data.models.includes(settings.model)) {
          setSettings((prev) => ({ ...prev, model: data.models[0] }));
        }
        setTestStatus({
          type: "success",
          message: `Conexão bem-sucedida! ${data.models.length} modelos ativos encontrados.`,
          modelCount: data.models.length,
        });
      } else {
        throw new Error(data.error || "Nenhum modelo retornado pela API.");
      }
    } catch (err: any) {
      console.error("Erro ao buscar modelos:", err);
      setTestStatus({
        type: "error",
        message: err.message || "Não foi possível buscar a lista de modelos ativos.",
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleSave = () => {
    saveAISettings(settings);
    if (onSettingsSaved) {
      onSettingsSaved(settings);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#12141A] border border-[#262A36] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#EDEDED]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#22252F] bg-[#171A23]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-white flex items-center gap-2">
                Configurações de IA & Modelos
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  Multiprovedor
                </span>
              </h2>
              <p className="text-xs text-[#8E929E]">
                Escolha o motor de inteligência artificial, chave de API e controle de custos de transcrição.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8E929E] hover:text-white hover:bg-[#22252F] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* 1. Provedor de IA */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              1. Provedor de Inteligência Artificial
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { id: "gemini_server", label: "Gemini Integrado", badge: "Padrão (Sem Chave)", icon: "✨" },
                { id: "gemini_custom", label: "Google Gemini", badge: "Chave Própria", icon: "🌐" },
                { id: "openai", label: "OpenAI", badge: "GPT-4o / o3", icon: "🧠" },
                { id: "anthropic", label: "Anthropic", badge: "Claude 3.7", icon: "⚡" },
                { id: "groq", label: "Groq Cloud", badge: "Llama 3.3 / Ultra-Rápido", icon: "🚀" },
                { id: "custom_openai", label: "Ollama / Local", badge: "OpenAI-Compatible", icon: "💻" },
              ].map((prov) => {
                const isSelected = settings.provider === prov.id;
                return (
                  <button
                    key={prov.id}
                    type="button"
                    onClick={() => handleProviderChange(prov.id as AIProviderType)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500 text-white shadow-md shadow-blue-500/10"
                        : "bg-[#161820] border-[#22252F] text-[#9CA3AF] hover:bg-[#1C1F2A] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-base">{prov.icon}</span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                    </div>
                    <span className="font-semibold text-xs text-white">{prov.label}</span>
                    <span className="text-[10px] text-[#8E929E] mt-0.5">{prov.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Chave de API ou Endpoint Customizado */}
          {settings.provider !== "gemini_server" && (
            <div className="space-y-3 p-4 rounded-xl bg-[#161820] border border-[#22252F]">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Chave de API ({settings.provider === "gemini_custom" ? "Google AI Studio" : settings.provider.toUpperCase()})
                  </span>
                </label>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Salvo localmente no seu navegador
                </span>
              </div>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder={`Cole sua chave ${settings.provider === "openai" ? "sk-..." : "AIzaSy..."}`}
                className="w-full bg-[#0E1015] border border-[#2A2E3D] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-blue-500"
              />

              {settings.provider === "custom_openai" && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-purple-400" />
                    <span>Base URL da API (Ollama, Together, vLLM ou LM Studio)</span>
                  </label>
                  <input
                    type="text"
                    value={settings.customBaseUrl || ""}
                    onChange={(e) => setSettings({ ...settings, customBaseUrl: e.target.value })}
                    placeholder="http://localhost:11434/v1"
                    className="w-full bg-[#0E1015] border border-[#2A2E3D] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-[11px] text-[#8E929E]">
                    Para o Ollama local no Windows, utilize <code>http://localhost:11434/v1</code>.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. Seleção de Modelo & Busca de Modelos Ativos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                <span>2. Modelo de IA Ativo</span>
              </label>

              <button
                type="button"
                onClick={handleFetchActiveModels}
                disabled={isLoadingModels}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium px-2.5 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingModels ? "animate-spin" : ""}`} />
                <span>{isLoadingModels ? "Buscando..." : "Buscar Modelos Ativos da API"}</span>
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="flex-1 bg-[#161820] border border-[#262A36] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                placeholder="Ou digite ID manual..."
                className="w-48 bg-[#161820] border border-[#262A36] rounded-xl px-3 py-2 text-xs text-white placeholder-[#5A6072] focus:outline-none focus:border-blue-500 font-mono"
                title="Você também pode digitar o nome exato de qualquer modelo suportado pela API"
              />
            </div>

            {testStatus.message && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  testStatus.type === "success"
                    ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
                    : testStatus.type === "error"
                    ? "bg-red-950/40 border border-red-500/30 text-red-300"
                    : "bg-blue-950/40 border border-blue-500/30 text-blue-300"
                }`}
              >
                {testStatus.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
                {testStatus.type === "error" && <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />}
                {testStatus.type === "idle" && <RefreshCw className="w-4 h-4 shrink-0 animate-spin text-blue-400" />}
                <span>{testStatus.message}</span>
              </div>
            )}
          </div>

          {/* 4. Controle de Transcrição Contínua & Consumo de Tokens */}
          <div className="space-y-3 pt-2 border-t border-[#22252F]">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              3. Controle de Transcrição & Economia de Tokens
            </label>

            <div className="space-y-2.5">
              {/* Toggle 1: Live browser speech */}
              <div className="flex items-start justify-between p-3 rounded-xl bg-[#161820] border border-[#22252F]">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Transcrição Contínua ao Vivo no Navegador</span>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded font-mono">
                      0 Tokens (Gratuito)
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E929E]">
                    Utiliza a Web Speech API nativa do Chrome/Edge em tempo real durante a gravação. Não consome cota nem tokens de IA.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.enableLiveBrowserSpeech}
                    onChange={(e) => setSettings({ ...settings, enableLiveBrowserSpeech: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#262A36] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Toggle 2: Auto-process with AI */}
              <div className="flex items-start justify-between p-3 rounded-xl bg-[#161820] border border-[#22252F]">
                <div className="space-y-0.5 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Processar com IA Automaticamente ao Finalizar</span>
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.2 rounded font-mono">
                      IA Pós-Gravação
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E929E]">
                    Gera transcrição aprimorada, ata e resumo assim que você clica em finalizar. Se desativado, o áudio MP3 é salvo imediatamente e você pode rodar a IA sob demanda quando quiser.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={settings.autoProcessWithAiOnRecordEnd}
                    onChange={(e) => setSettings({ ...settings, autoProcessWithAiOnRecordEnd: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-[#262A36] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 5. Template Padrão de Reunião */}
          <div className="space-y-2.5 pt-2 border-t border-[#22252F]">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              4. Template Padrão de Reunião
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MEETING_TEMPLATES.map((tmpl) => {
                const isSelected = settings.defaultTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSettings({ ...settings, defaultTemplate: tmpl.id })}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                      isSelected
                        ? "bg-blue-600/15 border-blue-500 text-white"
                        : "bg-[#161820] border-[#22252F] text-[#9CA3AF] hover:bg-[#1C1F2A] hover:text-white"
                    }`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{tmpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white truncate">{tmpl.shortLabel}</span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-1" />}
                      </div>
                      <p className="text-[11px] text-[#8E929E] line-clamp-2 mt-0.5">{tmpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#22252F] bg-[#171A23]">
          <button
            type="button"
            onClick={() => setSettings(DEFAULT_AI_SETTINGS)}
            className="text-xs text-[#8E929E] hover:text-white transition cursor-pointer"
          >
            Restaurar Padrões
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#C4C7D0] hover:text-white bg-[#1F222C] hover:bg-[#282C38] transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/25 transition cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Salvar Configurações</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
