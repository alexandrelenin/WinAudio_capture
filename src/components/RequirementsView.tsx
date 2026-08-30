import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Filter,
  Plus,
  Search,
  Download,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  Tag,
  AlertCircle,
} from "lucide-react";
import { MeetingRecord, FunctionalRequirement, NonFunctionalRequirement, BusinessRule, UserStory } from "../types";
import { exportRequirementsAsCSV, exportMeetingAsMarkdown } from "../utils/exportUtils";

interface RequirementsViewProps {
  meeting: MeetingRecord;
  onUpdateMeeting: (updated: Partial<MeetingRecord>) => void;
}

export const RequirementsView: React.FC<RequirementsViewProps> = ({
  meeting,
  onUpdateMeeting,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<"rf" | "rnf" | "rn" | "userStories">("rf");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddRfModal, setShowAddRfModal] = useState<boolean>(false);

  // New RF state
  const [newRfTitle, setNewRfTitle] = useState("");
  const [newRfDesc, setNewRfDesc] = useState("");
  const [newRfPriority, setNewRfPriority] = useState<"Alta" | "Média" | "Baixa">("Alta");

  const rfs = meeting.analysis?.functionalRequirements || [];
  const rnfs = meeting.analysis?.nonFunctionalRequirements || [];
  const rns = meeting.analysis?.businessRules || [];
  const userStories = meeting.analysis?.userStories || [];

  // Filtered RFs
  const filteredRfs = rfs.filter((rf) => {
    const matchesSearch =
      rf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rf.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rf.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || rf.priority === priorityFilter;
    const matchesStatus = statusFilter === "all" || (rf.status || "Pendente") === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const handleUpdateRfStatus = (rfId: string, newStatus: FunctionalRequirement["status"]) => {
    const updatedRfs = rfs.map((r) => (r.id === rfId ? { ...r, status: newStatus } : r));
    const updatedAnalysis = {
      ...meeting.analysis,
      functionalRequirements: updatedRfs,
    };
    onUpdateMeeting({ analysis: updatedAnalysis });
  };

  const handleAddCustomRf = () => {
    if (!newRfTitle.trim()) return;
    const nextNum = rfs.length + 1;
    const newRf: FunctionalRequirement = {
      id: `RF${String(nextNum).padStart(2, "0")}`,
      title: newRfTitle.trim(),
      description: newRfDesc.trim() || newRfTitle.trim(),
      priority: newRfPriority,
      complexity: "M",
      status: "Pendente",
      sourceQuote: "Adicionado manualmente pelo usuário",
    };

    const updatedAnalysis = {
      ...meeting.analysis,
      functionalRequirements: [...rfs, newRf],
    };
    onUpdateMeeting({ analysis: updatedAnalysis });
    setNewRfTitle("");
    setNewRfDesc("");
    setShowAddRfModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with Subtabs & Export tools */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#14161B] border border-[#22252D] rounded-xl p-3 shadow-sm">
        {/* Subtabs */}
        <div className="flex flex-wrap items-center gap-1 bg-[#0E1015] p-1 rounded-lg border border-[#22252D]">
          <button
            onClick={() => setActiveSubTab("rf")}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
              activeSubTab === "rf"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
            }`}
          >
            Funcionais (RF) • {rfs.length}
          </button>
          <button
            onClick={() => setActiveSubTab("rnf")}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
              activeSubTab === "rnf"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
            }`}
          >
            Não-Funcionais (RNF) • {rnfs.length}
          </button>
          <button
            onClick={() => setActiveSubTab("rn")}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
              activeSubTab === "rn"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
            }`}
          >
            Regras de Negócio (RN) • {rns.length}
          </button>
          <button
            onClick={() => setActiveSubTab("userStories")}
            className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
              activeSubTab === "userStories"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
            }`}
          >
            User Stories (BDD) • {userStories.length}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5">
          {activeSubTab === "rf" && (
            <button
              onClick={() => setShowAddRfModal(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#EDEDED] border border-[#2A2D35] transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Novo Requisito</span>
            </button>
          )}

          <button
            onClick={() => exportRequirementsAsCSV(meeting)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
            title="Exportar Requisitos para CSV (compatível com Jira e Excel)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Jira/Excel</span>
          </button>

          <button
            onClick={() => exportMeetingAsMarkdown(meeting)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/30 transition cursor-pointer"
            title="Baixar Especificação de Requisitos Completa em Markdown"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Markdown</span>
          </button>
        </div>
      </div>

      {/* Subtab 1: Requisitos Funcionais */}
      {activeSubTab === "rf" && (
        <div className="space-y-3">
          {/* Search & Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-6 relative">
              <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por ID, título ou termo do requisito..."
                className="w-full bg-[#14161B] border border-[#22252D] focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full bg-[#14161B] border border-[#22252D] rounded-lg px-2.5 py-1.5 text-xs text-[#C4C7D0] focus:outline-none"
              >
                <option value="all">Todas as Prioridades</option>
                <option value="Alta">Prioridade Alta</option>
                <option value="Média">Prioridade Média</option>
                <option value="Baixa">Prioridade Baixa</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-[#14161B] border border-[#22252D] rounded-lg px-2.5 py-1.5 text-xs text-[#C4C7D0] focus:outline-none"
              >
                <option value="all">Todos os Status</option>
                <option value="Pendente">Pendente</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Implementado">Implementado</option>
              </select>
            </div>
          </div>

          {/* List of RF cards */}
          {filteredRfs.length === 0 ? (
            <div className="text-center py-10 bg-[#14161B] border border-[#22252D] rounded-xl p-5 text-[#8E929E] space-y-1.5">
              <AlertCircle className="w-6 h-6 text-[#6B7280] mx-auto" />
              <p className="text-xs">Nenhum requisito funcional encontrado com os filtros atuais.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {filteredRfs.map((rf) => (
                <div
                  key={rf.id}
                  className="bg-[#14161B] border border-[#22252D] hover:border-blue-500/40 rounded-xl p-3.5 shadow-sm transition space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        {rf.id}
                      </span>
                      <h3 className="font-bold text-xs text-[#EDEDED]">{rf.title}</h3>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Priority */}
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                          rf.priority === "Alta"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : rf.priority === "Média"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-slate-500/10 text-slate-400 border-slate-500/30"
                        }`}
                      >
                        Prioridade {rf.priority}
                      </span>

                      {/* Complexity */}
                      {rf.complexity && (
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#1C1F26] text-[#C4C7D0] border border-[#2A2D35]">
                          Complexidade {rf.complexity}
                        </span>
                      )}

                      {/* Status select */}
                      <select
                        value={rf.status || "Pendente"}
                        onChange={(e) =>
                          handleUpdateRfStatus(rf.id, e.target.value as FunctionalRequirement["status"])
                        }
                        className="bg-[#1C1F26] border border-[#2A2D35] rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-[#EDEDED] focus:outline-none"
                      >
                        <option value="Pendente">⏳ Pendente</option>
                        <option value="Em Análise">🔍 Em Análise</option>
                        <option value="Aprovado">✅ Aprovado</option>
                        <option value="Implementado">🚀 Implementado</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs text-[#C4C7D0] leading-relaxed">{rf.description}</p>

                  {rf.sourceQuote && (
                    <div className="p-2 rounded-lg bg-[#0E1015] border border-[#22252D] text-[11px] text-[#8E929E] italic">
                      <span className="text-blue-400 font-semibold not-italic">Trecho citado:</span> "
                      {rf.sourceQuote}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Subtab 2: Requisitos Não-Funcionais */}
      {activeSubTab === "rnf" && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rnfs.map((rnf) => (
              <div
                key={rnf.id}
                className="bg-[#14161B] border border-[#22252D] rounded-xl p-3.5 shadow-sm space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    {rnf.id}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-[#1C1F26] text-[#C4C7D0] border border-[#2A2D35]">
                    {rnf.category}
                  </span>
                </div>

                <p className="text-xs text-[#EDEDED] leading-relaxed">{rnf.description}</p>

                {rnf.complianceCriteria && (
                  <div className="pt-1.5 border-t border-[#22252D] text-[11px] text-[#8E929E]">
                    <span className="text-purple-400 font-semibold">Critério de Aceite: </span>
                    {rnf.complianceCriteria}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 3: Regras de Negócio */}
      {activeSubTab === "rn" && (
        <div className="space-y-2.5">
          {rns.map((rn) => (
            <div
              key={rn.id}
              className="bg-[#14161B] border border-[#22252D] rounded-xl p-3 shadow-sm flex items-start gap-2.5"
            >
              <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                {rn.id}
              </span>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#EDEDED]">{rn.rule}</p>
                {rn.impact && <p className="text-[11px] text-[#8E929E] italic">Impacto: {rn.impact}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Subtab 4: User Stories & BDD */}
      {activeSubTab === "userStories" && (
        <div className="space-y-3">
          {userStories.map((us) => (
            <div
              key={us.id}
              className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  {us.id}
                </span>
                <span className="text-xs font-bold text-[#EDEDED]">História de Usuário</span>
              </div>

              {/* Persona / Action / Benefit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#0E1015] border border-[#22252D] text-xs">
                <div>
                  <span className="text-[10px] text-[#8E929E] uppercase font-bold block">Como:</span>
                  <span className="text-[#EDEDED]">{us.role}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8E929E] uppercase font-bold block">Quero:</span>
                  <span className="text-[#EDEDED]">{us.action}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8E929E] uppercase font-bold block">Para que:</span>
                  <span className="text-[#EDEDED]">{us.benefit}</span>
                </div>
              </div>

              {/* Gherkin */}
              {us.gherkin && (
                <div className="space-y-1">
                  <span className="text-[10px] text-[#8E929E] uppercase font-bold block">
                    Critérios de Aceitação (Gherkin BDD):
                  </span>
                  <pre className="p-2.5 rounded-lg bg-[#0E1015] border border-[#22252D] text-[11px] font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {us.gherkin}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Add Custom Requirement */}
      {showAddRfModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#14161B] border border-[#22252D] rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-3.5">
            <h3 className="text-sm font-bold text-white">Adicionar Novo Requisito Funcional</h3>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs text-[#C4C7D0] mb-1 font-semibold">Título do Requisito</label>
                <input
                  type="text"
                  value={newRfTitle}
                  onChange={(e) => setNewRfTitle(e.target.value)}
                  placeholder="Ex: Exportação de Relatórios Financeiros em Excel"
                  className="w-full bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg px-3 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#C4C7D0] mb-1 font-semibold">Descrição Detalhada</label>
                <textarea
                  value={newRfDesc}
                  onChange={(e) => setNewRfDesc(e.target.value)}
                  placeholder="Descreva o comportamento esperado do sistema e regras associadas..."
                  rows={3}
                  className="w-full bg-[#0E1015] border border-[#22252D] focus:border-blue-500 rounded-lg p-2.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#C4C7D0] mb-1 font-semibold">Prioridade</label>
                <select
                  value={newRfPriority}
                  onChange={(e) => setNewRfPriority(e.target.value as any)}
                  className="w-full bg-[#0E1015] border border-[#22252D] rounded-lg px-2.5 py-1.5 text-xs text-[#EDEDED] focus:outline-none"
                >
                  <option value="Alta">Alta</option>
                  <option value="Média">Média</option>
                  <option value="Baixa">Baixa</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddRfModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#C4C7D0] border border-[#2A2D35]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddCustomRf}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 cursor-pointer"
              >
                Salvar Requisito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
