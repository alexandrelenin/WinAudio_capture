import { MeetingRecord } from "../types";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMeetingAsMarkdown(meeting: MeetingRecord): void {
  const a = meeting.analysis;
  let md = `# Ata de Reunião & Levantamento de Requisitos: ${meeting.title}\n\n`;
  md += `**Data:** ${new Date(meeting.createdAt).toLocaleString("pt-BR")}\n`;
  md += `**Duração:** ${meeting.durationFormatted}\n`;
  md += `**Fonte de Áudio:** ${meeting.sourceType === "system" ? "Áudio do Sistema / PC" : meeting.sourceType === "mic" ? "Microfone" : "Mixagem Dupla (PC + Mic)"}\n`;
  md += `**Modo de Processamento:** ${a?.mode === "ai" ? "IA Gemini 3.7 Cloud" : "Motor Local Offline Windows"}\n\n`;

  if (a?.executiveSummary) {
    md += `## 📌 Resumo Executivo\n${a.executiveSummary}\n\n`;
  }

  if (a?.keyPoints && a.keyPoints.length > 0) {
    md += `## 🎯 Pontos Principais & Deliberações\n`;
    a.keyPoints.forEach((kp) => {
      md += `- ${kp}\n`;
    });
    md += `\n`;
  }

  if (a?.functionalRequirements && a.functionalRequirements.length > 0) {
    md += `## ⚙️ Requisitos Funcionais (RF)\n\n`;
    md += `| ID | Título | Prioridade | Complexidade | Descrição |\n`;
    md += `|---|---|---|---|---|\n`;
    a.functionalRequirements.forEach((rf) => {
      md += `| **${rf.id}** | ${rf.title} | ${rf.priority} | ${rf.complexity || "M"} | ${rf.description} |\n`;
    });
    md += `\n`;
  }

  if (a?.nonFunctionalRequirements && a.nonFunctionalRequirements.length > 0) {
    md += `## 🛡️ Requisitos Não-Funcionais (RNF)\n\n`;
    md += `| ID | Categoria | Descrição | Critério de Conformidade |\n`;
    md += `|---|---|---|---|\n`;
    a.nonFunctionalRequirements.forEach((rnf) => {
      md += `| **${rnf.id}** | ${rnf.category} | ${rnf.description} | ${rnf.complianceCriteria} |\n`;
    });
    md += `\n`;
  }

  if (a?.businessRules && a.businessRules.length > 0) {
    md += `## 📜 Regras de Negócio (RN)\n\n`;
    a.businessRules.forEach((rn) => {
      md += `- **${rn.id}:** ${rn.rule} ${rn.impact ? `*(Impacto: ${rn.impact})*` : ""}\n`;
    });
    md += `\n`;
  }

  if (a?.userStories && a.userStories.length > 0) {
    md += `## 👤 Histórias de Usuário (User Stories) & BDD\n\n`;
    a.userStories.forEach((us) => {
      md += `### ${us.id}: ${us.role}\n`;
      md += `**Como:** ${us.role}\n`;
      md += `**Quero:** ${us.action}\n`;
      md += `**Para:** ${us.benefit}\n\n`;
      if (us.gherkin) {
        md += `\`\`\`gherkin\n${us.gherkin}\n\`\`\`\n\n`;
      }
    });
  }

  if (a?.actionItems && a.actionItems.length > 0) {
    md += `## ✅ Plano de Ação & Tarefas\n\n`;
    a.actionItems.forEach((act) => {
      md += `- [${act.completed ? "x" : " "}] **${act.task}** (Responsável: ${act.assignee || "A definir"} | Prazo: ${act.deadline || "N/A"})\n`;
    });
    md += `\n`;
  }

  if (meeting.markers && meeting.markers.length > 0) {
    md += `## ⏱️ Marcadores Registrados no Áudio\n\n`;
    meeting.markers.forEach((m) => {
      md += `- **${m.timeFormatted}** [${m.type.toUpperCase()}] ${m.label} ${m.note ? `(${m.note})` : ""}\n`;
    });
    md += `\n`;
  }

  if (meeting.transcript) {
    md += `## 🎙️ Transcrição Completa da Reunião\n\n`;
    md += `> ${meeting.transcript.replace(/\n/g, "\n> ")}\n\n`;
  }

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, `${slugify(meeting.title)}_requisitos.md`);
}

export function exportRequirementsAsCSV(meeting: MeetingRecord): void {
  const rfs = meeting.analysis?.functionalRequirements || [];
  const rnfs = meeting.analysis?.nonFunctionalRequirements || [];

  let csv = `Tipo,ID,Título/Categoria,Prioridade/Critério,Descrição,Status\n`;

  rfs.forEach((rf) => {
    csv += `"Funcional","${rf.id}","${escapeCsv(rf.title)}","${rf.priority}","${escapeCsv(rf.description)}","${rf.status || "Pendente"}"\n`;
  });

  rnfs.forEach((rnf) => {
    csv += `"Não-Funcional","${rnf.id}","${escapeCsv(rnf.category)}","${escapeCsv(rnf.complianceCriteria)}","${escapeCsv(rnf.description)}","Definido"\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${slugify(meeting.title)}_requisitos.csv`);
}

export function exportMeetingAsJSON(meeting: MeetingRecord): void {
  // Exclude raw blob from JSON to keep clean backup
  const { audioBlob, ...cleanObj } = meeting;
  const jsonStr = JSON.stringify(cleanObj, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
  downloadBlob(blob, `${slugify(meeting.title)}_backup.json`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 35);
}

function escapeCsv(text: string): string {
  return (text || "").replace(/"/g, '""').replace(/\n/g, " ");
}
