export type Election = {
  year: number;
  /** Data do primeiro turno (ISO, fuso de Brasília). */
  firstRound: string;
  /** Data do segundo turno, quando houve. */
  runoff: string | null;
  winner: string;
  /** O que o mercado tinha como cenário dominante na véspera. */
  pricedIn: string;
  /** Resumo factual do que aconteceu com os preços. */
  note: string;
};

export const ELECTIONS: Election[] = [
  {
    year: 2014,
    firstRound: "2014-10-05",
    runoff: "2014-10-26",
    winner: "Dilma Rousseff (reeleita)",
    pricedIn:
      "Rali de alternância: a Bolsa subiu forte entre março e setembro conforme as pesquisas sugeriam mudança de governo.",
    note: "O caso-limite de eleição precificada antes da hora. A reversão veio na apuração, e as estatais devolveram o prêmio que tinham acumulado.",
  },
  {
    year: 2018,
    firstRound: "2018-10-07",
    runoff: "2018-10-28",
    winner: "Jair Bolsonaro",
    pricedIn:
      "Agenda liberal com Paulo Guedes na Fazenda, promessa de privatizações e reforma da Previdência.",
    note: "O resultado confirmou o cenário que o mercado vinha comprando desde setembro, então a alta veio antes e continuou depois.",
  },
  {
    year: 2022,
    firstRound: "2022-10-02",
    runoff: "2022-10-30",
    winner: "Luiz Inácio Lula da Silva",
    pricedIn:
      "Vitória de Lula amplamente esperada nas pesquisas, com dúvida sobre a âncora fiscal do novo mandato.",
    note: "A eleição em si mexeu pouco. O estrago veio depois, com a PEC da Transição, mostrando que o que importa é o que o governo faz, não quem ganha.",
  },
];

/** Eleição de 2026, ainda no futuro — usada para contagem regressiva. */
export const NEXT_ELECTION = {
  year: 2026,
  firstRound: "2026-10-04",
  runoff: "2026-10-25",
} as const;

/**
 * Janelas em que medimos o comportamento de cada ação.
 * Offsets em pregões, relativos ao dia do evento.
 */
export type WindowSpec = {
  id: string;
  label: string;
  anchor: "firstRound" | "runoff";
  from: number;
  to: number;
  description: string;
};

export const EVENT_WINDOWS: WindowSpec[] = [
  {
    id: "pre90",
    label: "90 pregões antes",
    anchor: "firstRound",
    from: -90,
    to: 0,
    description:
      "A corrida eleitoral em si. É aqui que o mercado recalcula probabilidades e move os preços.",
  },
  {
    id: "d1",
    label: "1º pregão pós-1º turno",
    anchor: "firstRound",
    from: 0,
    to: 1,
    description:
      "A reação imediata ao resultado. Mede o quanto o mercado foi surpreendido.",
  },
  {
    id: "d5",
    label: "5 pregões pós-1º turno",
    anchor: "firstRound",
    from: 0,
    to: 5,
    description: "A primeira semana, já sem o ruído do choque inicial.",
  },
  {
    id: "runoffD1",
    label: "1º pregão pós-2º turno",
    anchor: "runoff",
    from: 0,
    to: 1,
    description: "A reação ao vencedor definitivo.",
  },
  {
    id: "post60",
    label: "60 pregões após o 2º turno",
    anchor: "runoff",
    from: 0,
    to: 60,
    description:
      "A transição de governo: equipe econômica, primeiras sinalizações fiscais.",
  },
  {
    id: "post250",
    label: "1 ano após o 2º turno",
    anchor: "runoff",
    from: 0,
    to: 250,
    description:
      "O teste real. Aqui a euforia eleitoral ou vira alta estrutural, ou evapora.",
  },
];
