// Funções de data em português, sem bibliotecas externas.
// Semana começa na segunda-feira e termina no domingo.

export const DIAS_SEMANA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

/** Converte "2026-11-20" em Date local (meia-noite). */
export function paraData(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d);
}

/** Converte Date em "2026-11-20" (sem fuso). */
export function paraISO(data: Date): string {
  const a = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

export function hojeISO(): string {
  return paraISO(new Date());
}

export function somarDias(iso: string, dias: number): string {
  const d = paraData(iso);
  d.setDate(d.getDate() + dias);
  return paraISO(d);
}

/** Segunda-feira da semana que contém a data. */
export function inicioDaSemana(iso: string): string {
  const d = paraData(iso);
  const diaSemana = d.getDay(); // 0 = domingo
  const atras = diaSemana === 0 ? 6 : diaSemana - 1;
  d.setDate(d.getDate() - atras);
  return paraISO(d);
}

/** Os 7 dias (ISO) da semana que começa em segundaISO. */
export function diasDaSemana(segundaISO: string): string[] {
  return Array.from({ length: 7 }, (_, i) => somarDias(segundaISO, i));
}

/** "20/11" */
export function diaMes(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** "Sex 20/11" */
export function rotuloDia(iso: string): string {
  return `${DIAS_SEMANA_CURTO[paraData(iso).getDay()]} ${diaMes(iso)}`;
}

/** "11:00:00" -> "11:00" */
export function horaCurta(hora: string): string {
  return hora.slice(0, 5);
}

/** "11:00" -> minutos desde meia-noite */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}
