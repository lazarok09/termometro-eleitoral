export type Election = {
  year: number;
  /** Data do primeiro turno (ISO, fuso de Brasília). */
  firstRound: string;
  /** Data do segundo turno, quando houve. */
  runoff: string | null;
};

export const ELECTIONS: Election[] = [
  {
    year: 2014,
    firstRound: "2014-10-05",
    runoff: "2014-10-26",
  },
  {
    year: 2018,
    firstRound: "2018-10-07",
    runoff: "2018-10-28",
  },
  {
    year: 2022,
    firstRound: "2022-10-02",
    runoff: "2022-10-30",
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
 * UI copy: `Elections.windows.{id}.label` / `.description`.
 */
export type WindowSpec = {
  id: string;
  anchor: "firstRound" | "runoff";
  from: number;
  to: number;
};

export const EVENT_WINDOWS: WindowSpec[] = [
  { id: "pre90", anchor: "firstRound", from: -90, to: 0 },
  { id: "d1", anchor: "firstRound", from: 0, to: 1 },
  { id: "d5", anchor: "firstRound", from: 0, to: 5 },
  { id: "runoffD1", anchor: "runoff", from: 0, to: 1 },
  { id: "post60", anchor: "runoff", from: 0, to: 60 },
  { id: "post250", anchor: "runoff", from: 0, to: 250 },
];

/** Message key helpers for the `Elections` namespace. */
export function electionYearKey(year: number): string {
  return String(year);
}

export function windowLabelKey(id: string): string {
  return `windows.${id}.label`;
}

export function windowDescriptionKey(id: string): string {
  return `windows.${id}.description`;
}
