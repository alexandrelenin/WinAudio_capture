import React, { useState } from "react";
import {
  GraduationCap,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  BookOpen,
  CheckCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { MeetingRecord, Flashcard, ReviewQuestion, GlossaryItem } from "../types";

interface StudyModeViewProps {
  meeting: MeetingRecord;
}

export const StudyModeView: React.FC<StudyModeViewProps> = ({ meeting }) => {
  const [activeStudyTab, setActiveStudyTab] = useState<"flashcards" | "quiz" | "glossary">("flashcards");
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, boolean>>({});
  const [glossarySearch, setGlossarySearch] = useState<string>("");

  const studyGuide = meeting.analysis?.studyGuide;
  const flashcards: Flashcard[] = studyGuide?.flashcards || [
    {
      id: "fc-1",
      front: "Qual o propósito central desta reunião?",
      back: meeting.analysis?.executiveSummary || "Alinhamento de requisitos de sistema.",
    },
  ];
  const questions: ReviewQuestion[] = studyGuide?.reviewQuestions || [];
  const glossary: GlossaryItem[] = studyGuide?.glossary || [];
  const coreConcepts = studyGuide?.coreConcepts || [];

  const currentCard = flashcards[currentCardIndex] || flashcards[0];

  const handleNextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
  };

  const handlePrevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  const toggleQuestionReveal = (id: string) => {
    setRevealedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredGlossary = glossary.filter(
    (g) =>
      g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
      g.definition.toLowerCase().includes(glossarySearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="bg-[#14161B] border border-[#22252D] rounded-xl p-4 shadow-sm space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Modo de Estudo & Fixação Pós-Reunião
            </h2>
            <p className="text-[11px] text-[#8E929E]">
              Revise e memorize os pontos debatidos, requisitos chave e conceitos técnicos da reunião.
            </p>
          </div>
        </div>

        {/* Core concepts pills */}
        {coreConcepts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            <span className="text-[10px] text-[#8E929E] font-bold mr-1 uppercase">Conceitos-Chave:</span>
            {coreConcepts.map((concept, idx) => (
              <span
                key={idx}
                className="px-2 py-0.2 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
              >
                {concept}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[#14161B] p-1 rounded-lg border border-[#22252D] w-fit">
        <button
          onClick={() => setActiveStudyTab("flashcards")}
          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
            activeStudyTab === "flashcards"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
          }`}
        >
          Flashcards Interativos ({flashcards.length})
        </button>
        <button
          onClick={() => setActiveStudyTab("quiz")}
          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
            activeStudyTab === "quiz"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
          }`}
        >
          Perguntas de Fixação ({questions.length})
        </button>
        <button
          onClick={() => setActiveStudyTab("glossary")}
          className={`px-3 py-1 rounded-md text-xs font-bold transition ${
            activeStudyTab === "glossary"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-[#9CA3AF] hover:text-white hover:bg-[#1E212A]"
          }`}
        >
          Glossário Técnico ({glossary.length})
        </button>
      </div>

      {/* Tab 1: Flashcards */}
      {activeStudyTab === "flashcards" && (
        <div className="space-y-3 max-w-xl mx-auto">
          {/* Flashcard Box */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="cursor-pointer min-h-[220px] p-6 rounded-xl bg-[#0E1015] border border-[#22252D] hover:border-blue-500/50 shadow-md flex flex-col justify-between transition-all select-none text-center"
          >
            <div className="flex justify-between items-center text-[10px] text-[#8E929E]">
              <span className="font-mono font-bold">
                Card {currentCardIndex + 1} de {flashcards.length}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#1C1F26] text-blue-400 flex items-center gap-1 border border-[#2A2D35]">
                <RotateCw className="w-2.5 h-2.5" /> Clique para virar
              </span>
            </div>

            <div className="py-4">
              {!isFlipped ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-[#8E929E] font-bold block">
                    Pergunta / Conceito
                  </span>
                  <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
                    {currentCard.front}
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold block">
                    Resposta & Explicação
                  </span>
                  <p className="text-xs sm:text-sm text-[#EDEDED] leading-relaxed font-sans">
                    {currentCard.back}
                  </p>
                </div>
              )}
            </div>

            <div className="text-[10px] text-[#6B7280]">
              {isFlipped ? "✅ Lado da resposta" : "❓ Lado da pergunta"}
            </div>
          </div>

          {/* Nav Controls */}
          <div className="flex items-center justify-between px-1">
            <button
              onClick={handlePrevCard}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#EDEDED] border border-[#2A2D35] transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Anterior</span>
            </button>

            <button
              onClick={() => setIsFlipped(!isFlipped)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1C1F26] hover:bg-[#252830] text-blue-400 border border-[#2A2D35] transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCw className="w-3 h-3" />
              <span>Virar Card</span>
            </button>

            <button
              onClick={handleNextCard}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 transition cursor-pointer"
            >
              <span>Próximo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Quiz / Perguntas de Revisão */}
      {activeStudyTab === "quiz" && (
        <div className="space-y-2.5 max-w-2xl mx-auto">
          {questions.map((q, idx) => {
            const isRevealed = !!revealedQuestions[q.id];
            return (
              <div
                key={q.id}
                className="bg-[#14161B] border border-[#22252D] rounded-xl p-3.5 shadow-sm space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      Q{idx + 1}
                    </span>
                    <h3 className="font-bold text-xs text-white">{q.question}</h3>
                  </div>

                  <button
                    onClick={() => toggleQuestionReveal(q.id)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-[#1C1F26] hover:bg-[#252830] text-[#EDEDED] border border-[#2A2D35] transition shrink-0 cursor-pointer"
                  >
                    {isRevealed ? "Ocultar" : "Ver Gabarito"}
                  </button>
                </div>

                {isRevealed && (
                  <div className="p-3 rounded-lg bg-[#0E1015] border border-[#22252D] space-y-1.5 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                        Gabarito:
                      </span>
                      <p className="text-[#EDEDED] leading-relaxed mt-0.5">{q.answer}</p>
                    </div>

                    {q.explanation && (
                      <div className="pt-1.5 border-t border-[#22252D] text-[#8E929E] italic text-[11px]">
                        <span className="text-blue-400 font-semibold not-italic">Explicação: </span>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Glossário Técnico */}
      {activeStudyTab === "glossary" && (
        <div className="space-y-3 max-w-2xl mx-auto">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#6B7280] absolute left-3 top-2.5" />
            <input
              type="text"
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              placeholder="Pesquisar termo técnico ou sigla..."
              className="w-full bg-[#14161B] border border-[#22252D] focus:border-blue-500 rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#EDEDED] placeholder-[#6B7280] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredGlossary.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#14161B] border border-[#22252D] rounded-xl p-3 shadow-sm space-y-1"
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                  <h4 className="font-bold text-xs text-blue-300">{item.term}</h4>
                </div>
                <p className="text-xs text-[#C4C7D0] leading-relaxed">{item.definition}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
