import { MeetingRecord } from "../types";

export function getInitialSampleMeeting(): MeetingRecord {
  return {
    id: "sample-meeting-pix-windows",
    title: "Levantamento de Requisitos - Gateway de Pagamento & Módulo Windows",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    duration: 345, // ~5m45s
    durationFormatted: "05:45",
    sourceType: "dual_mix",
    format: "mp3",
    fileSizeFormatted: "7.9 MB",
    favorite: true,
    tags: ["Requisitos", "Arquitetura", "Pix", "Windows 11", "Segurança"],
    transcript: `[00:05] Analista: Olá pessoal, iniciando a reunião de alinhamento e levantamento de requisitos para o novo módulo de faturamento e integração com Pix no aplicativo desktop Windows.
[00:32] Tech Lead: Perfeito. O primeiro requisito funcional inegociável é que o sistema deve gerar o QR Code dinâmico do Pix em menos de 800 milissegundos após a solicitação do usuário.
[01:15] Product Owner: Isso mesmo. Além disso, o sistema precisa notificar em tempo real no Windows (via Windows Toast Notification) quando a confirmação do pagamento for recebida pelo webhook do banco.
[02:04] Arquiteto de Software: Sobre a segurança e conformidade, todos os tokens de API e certificados mTLS devem ser armazenados no Windows Credential Manager ou DPAPI criptografada, nunca em arquivos de texto plano.
[02:50] QA Engineer: Uma regra de negócio importante: caso o Pix expire após 15 minutos sem pagamento, o sistema deve cancelar automaticamente a reserva do item no inventário e emitir um aviso ao operador.
[03:40] Product Owner: Perfeito. E quanto ao modo offline? Se a rede cair no Windows, o aplicativo deve reter a fila de sincronização localmente em banco SQLite/IndexedDB e tentar o reenvio com exponential backoff assim que a conexão restabelecer.
[04:30] Analista: Excelente. Para os próximos passos: o Tech Lead vai entregar a documentação OpenAPI/Swagger até sexta-feira, e a equipe de frontend Windows vai prototipar a tela de checkout com tema Fluent Design.`,
    offlineNotes:
      "Pauta: 1. QR Code Pix Dinâmico; 2. Armazenamento seguro DPAPI no Windows; 3. Notificações Toast do Windows; 4. Resiliência Offline.",
    markers: [
      {
        id: "m-1",
        timestamp: 32,
        timeFormatted: "00:32",
        label: "RF01: Geração de QR Code Pix Dinâmico",
        type: "requisito",
        note: "Latência máxima 800ms",
      },
      {
        id: "m-2",
        timestamp: 124,
        timeFormatted: "02:04",
        label: "RNF01: Criptografia Windows Credential Manager",
        type: "requisito",
        note: "Segurança de chaves mTLS e certificados",
      },
      {
        id: "m-3",
        timestamp: 170,
        timeFormatted: "02:50",
        label: "RN01: Expiração do Pix em 15 minutos",
        type: "decisao",
        note: "Cancelamento de reserva de estoque automático",
      },
      {
        id: "m-4",
        timestamp: 270,
        timeFormatted: "04:30",
        label: "Ação: Entregar OpenAPI Swagger até sexta",
        type: "tarefa",
        note: "Responsável: Tech Lead",
      },
    ],
    analysis: {
      mode: "ai",
      generatedAt: new Date().toISOString(),
      executiveSummary:
        "Reunião de engenharia de software para especificação do módulo de pagamentos Pix integrado nativamente ao ambiente Windows. Foram formalizados os requisitos de desempenho do QR Code (<800ms), integração com notificações nativas do Windows, armazenamento criptografado via Windows DPAPI/Credential Manager, e protocolo de resiliência offline com fila de sincronização local.",
      keyPoints: [
        "QR Code Pix com tempo de geração inferior a 800ms.",
        "Integração nativa com Windows Toast Notifications para aviso de pagamento em tempo real.",
        "Armazenamento de chaves privadas em Windows Credential Manager.",
        "Regra de expiração estrita de 15 minutos para pedidos pendentes.",
        "Suporte a operação offline com retenção local e reconexão automática.",
      ],
      functionalRequirements: [
        {
          id: "RF01",
          title: "Geração de QR Code Pix Dinâmico",
          description:
            "O sistema deve permitir a geração imediata de QR Code dinâmico com payload EMVCo e chave Pix autenticada pelo Banco Central.",
          priority: "Alta",
          complexity: "M",
          status: "Aprovado",
          sourceQuote: "O sistema deve gerar o QR Code dinâmico do Pix em menos de 800 milissegundos após a solicitação.",
        },
        {
          id: "RF02",
          title: "Notificação Nativa no Windows em Tempo Real",
          description:
            "O sistema deve disparar notificações nativas do Windows (Toast Notifications) ao confirmar o recebimento do crédito via Webhook.",
          priority: "Alta",
          complexity: "P",
          status: "Em Análise",
          sourceQuote: "O sistema precisa notificar em tempo real no Windows quando a confirmação do pagamento for recebida.",
        },
        {
          id: "RF03",
          title: "Fila de Sincronização e Resiliência Offline",
          description:
            "O sistema deve reter transações em fila local criptografada quando offline e realizar reprocessamento automático com exponential backoff.",
          priority: "Alta",
          complexity: "G",
          status: "Pendente",
          sourceQuote: "Se a rede cair no Windows, o aplicativo deve reter a fila de sincronização localmente.",
        },
        {
          id: "RF04",
          title: "Cancelamento Automático de Reserva por Timeout",
          description:
            "O sistema deve liberar os itens reservados no inventário automaticamente quando o tempo limite de pagamento (15 min) expirar.",
          priority: "Média",
          complexity: "P",
          status: "Aprovado",
          sourceQuote: "Caso o Pix expire após 15 minutos sem pagamento, o sistema deve cancelar automaticamente a reserva.",
        },
      ],
      nonFunctionalRequirements: [
        {
          id: "RNF01",
          category: "Performance",
          description: "O tempo de resposta para geração e renderização do QR Code Pix na tela não deve exceder 800ms.",
          complianceCriteria: "Testes de carga com 95th percentile de latência sob 800ms.",
        },
        {
          id: "RNF02",
          category: "Segurança",
          description: "Certificados mTLS e tokens bancários devem ser salvos exclusivamente no Windows Credential Manager / DPAPI.",
          complianceCriteria: "Auditoria de segurança estática contra vazamento de credenciais em disco.",
        },
        {
          id: "RNF03",
          category: "Compatibilidade",
          description: "Compatibilidade total com Windows 10 e Windows 11 (arquiteturas x64 e ARM64).",
          complianceCriteria: "Validação em ambientes Windows 10 22H2 e Windows 11 23H2/24H2.",
        },
      ],
      businessRules: [
        {
          id: "RN01",
          rule: "O prazo de validade de cobrança Pix é fixado estritamente em 15 minutos.",
          impact: "Evita bloqueio indefinido de produtos no catálogo.",
        },
        {
          id: "RN02",
          rule: "Não é permitida a alteração de valor ou destinatário após emissão do QR Code dinâmico.",
          impact: "Garante integridade contábil e antifraude.",
        },
      ],
      userStories: [
        {
          id: "US-01",
          role: "Operador de Caixa no Windows",
          action: "gerar uma cobrança Pix dinâmica para o cliente na tela",
          benefit: "receber o pagamento de forma instantânea e segura",
          gherkin: `Cenário: Geração com sucesso de Pix Dinâmico
Dado que o operador finalizou os itens da venda no aplicativo Windows
Quando seleciona a forma de pagamento "Pix"
Então o sistema gera o QR Code na tela em menos de 800ms
E inicia o monitoramento de webhook para confirmação.`,
        },
        {
          id: "US-02",
          role: "Gerente Financeiro",
          action: "receber aviso sonoro e notificação Windows na confirmação do pagamento",
          benefit: "liberar a entrega do produto sem necessidade de conferência manual",
          gherkin: `Cenário: Notificação Toast de Pagamento Aprovado
Dado que uma cobrança Pix está pendente
Quando o webhook bancário envia status "CONFIRMADO"
Então o Windows exibe uma Toast Notification com o valor recebido
E a interface atualiza o status para "Venda Concluída".`,
        },
      ],
      actionItems: [
        {
          id: "act-1",
          task: "Elaborar especificação OpenAPI/Swagger do endpoint de Pix",
          assignee: "Tech Lead",
          completed: false,
          priority: "Alta",
          deadline: "Sexta-feira",
        },
        {
          id: "act-2",
          task: "Prototipar tela de checkout no padrão Windows Fluent Design",
          assignee: "UI/UX & Frontend Windows",
          completed: true,
          priority: "Média",
          deadline: "Próxima Sprint",
        },
      ],
      studyGuide: {
        coreConcepts: [
          "Protocolo Pix & Payload EMVCo",
          "Windows Credential Manager & DPAPI",
          "Webhooks & Notificações Assíncronas",
          "Fila de Tolerância a Falhas Offline",
        ],
        flashcards: [
          {
            id: "fc-1",
            front: "Qual é o tempo máximo tolerado para a geração do QR Code Pix?",
            back: "800 milissegundos (Requisito Não-Funcional RNF01 de Performance).",
          },
          {
            id: "fc-2",
            front: "Onde os certificados e tokens mTLS devem ser guardados no Windows?",
            back: "No Windows Credential Manager / DPAPI criptografada do sistema operacional.",
          },
          {
            id: "fc-3",
            front: "O que ocorre se o cliente não efetuar o pagamento dentro de 15 minutos?",
            back: "A regra de negócio RN01 cancela automaticamente a reserva do item no inventário.",
          },
          {
            id: "fc-4",
            front: "Como o sistema garante o funcionamento em caso de queda de rede no Windows?",
            back: "Mantém uma fila de sincronização local com política de retry e exponential backoff.",
          },
        ],
        reviewQuestions: [
          {
            id: "rq-1",
            question: "Por que não é recomendado salvar certificados em arquivos .env ou JSON planos no Windows?",
            answer:
              "Porque arquivos em texto plano ficam vulneráveis a acessos indevidos de outros processos e usuários. O Windows Credential Manager oferece isolamento baseado na chave do usuário do SO.",
            explanation: "Conformidade de segurança e padrões corporativos.",
          },
          {
            id: "rq-2",
            question: "Qual mecanismo avisa o operador que o cliente realizou o pagamento?",
            answer: "Webhook bancário integrado com Windows Toast Notifications em tempo real.",
            explanation: "Elimina a necessidade de refresh manual pelo operador.",
          },
        ],
        glossary: [
          {
            term: "DPAPI (Data Protection API)",
            definition: "API nativa do Windows para criptografia de dados simétrica no nível de usuário ou máquina.",
          },
          {
            term: "mTLS (Mutual TLS)",
            definition: "Autenticação mútua onde cliente e servidor bancário apresentam certificados digitais X.509.",
          },
          {
            term: "EMVCo QR Code",
            definition: "Padrão internacional de payload para pagamentos instantâneos adotado pelo Banco Central do Brasil.",
          },
          {
            term: "Toast Notification",
            definition: "Notificação retangular nativa que surge no canto inferior do Windows 10/11.",
          },
        ],
      },
    },
  };
}
