// Regras da casa aplicadas à escala. Funções puras: recebem os dados e devolvem alertas.

import { paraData } from "./datas";
import type { Escala, Funcionario, Regra, Turno } from "./tipos";

export type Configuracoes = {
  folgasMinimasSemana: number;
  bloquearFecharEAbrir: boolean;
  toleranciaAtrasoMinutos: number;
  horaExtraMinutos: number;
};

export const CONFIG_PADRAO: Configuracoes = {
  folgasMinimasSemana: 1,
  bloquearFecharEAbrir: true,
  toleranciaAtrasoMinutos: 10,
  horaExtraMinutos: 30,
};

export function lerConfiguracoes(linhas: { chave: string; valor: string }[]): Configuracoes {
  const mapa = new Map(linhas.map((l) => [l.chave, l.valor]));
  const numero = (chave: string, padrao: number) => {
    const v = Number(mapa.get(chave));
    return Number.isFinite(v) && mapa.has(chave) ? v : padrao;
  };
  return {
    folgasMinimasSemana: numero("folgas_minimas_semana", CONFIG_PADRAO.folgasMinimasSemana),
    bloquearFecharEAbrir: (mapa.get("bloquear_fechar_e_abrir") ?? "true") === "true",
    toleranciaAtrasoMinutos: numero("tolerancia_atraso_minutos", CONFIG_PADRAO.toleranciaAtrasoMinutos),
    horaExtraMinutos: numero("hora_extra_minutos", CONFIG_PADRAO.horaExtraMinutos),
  };
}

export type ResultadoAlertas = {
  /** chave `${data}|${turnoId}` -> avisos daquela célula */
  porCelula: Map<string, string[]>;
  /** avisos da semana inteira (folgas, fechar e abrir) */
  daSemana: string[];
  total: number;
};

export function chaveCelula(data: string, turnoId: string) {
  return `${data}|${turnoId}`;
}

type Entrada = {
  dias: string[];
  turnos: Turno[];
  funcionarios: Funcionario[];
  escalas: Escala[];
  regras: Regra[];
  config: Configuracoes;
};

export function calcularAlertas({ dias, turnos, funcionarios, escalas, regras, config }: Entrada): ResultadoAlertas {
  const porCelula = new Map<string, string[]>();
  const daSemana: string[] = [];
  const funcionarioPorId = new Map(funcionarios.map((f) => [f.id, f]));

  // 1. Mínimo de pessoas por turno e função
  for (const data of dias) {
    const diaSemana = paraData(data).getDay();
    for (const turno of turnos) {
      const escalados = escalas
        .filter((e) => e.data === data && e.turno_id === turno.id)
        .map((e) => funcionarioPorId.get(e.funcionario_id))
        .filter((f): f is Funcionario => Boolean(f));
      const avisos: string[] = [];
      // Regra específica do dia vale mais que a regra geral (dia_semana nulo)
      const regrasDoTurno = regras.filter((r) => r.turno_id === turno.id);
      const funcoes = new Set(regrasDoTurno.map((r) => r.funcao));
      for (const funcao of funcoes) {
        const especifica = regrasDoTurno.find((r) => r.funcao === funcao && r.dia_semana === diaSemana);
        const geral = regrasDoTurno.find((r) => r.funcao === funcao && r.dia_semana === null);
        const regra = especifica ?? geral;
        if (!regra) continue;
        const quantos = escalados.filter((f) => f.funcao.toLowerCase() === funcao.toLowerCase()).length;
        if (quantos < regra.minimo) {
          const faltam = regra.minimo - quantos;
          avisos.push(`Falta${faltam > 1 ? "m" : ""} ${faltam} em ${funcao}`);
        }
      }
      if (avisos.length) porCelula.set(chaveCelula(data, turno.id), avisos);
    }
  }

  // 2. Folgas na semana
  const diasTrabalhados = new Map<string, Set<string>>();
  for (const e of escalas) {
    if (!diasTrabalhados.has(e.funcionario_id)) diasTrabalhados.set(e.funcionario_id, new Set());
    diasTrabalhados.get(e.funcionario_id)!.add(e.data);
  }
  for (const [fid, datas] of diasTrabalhados) {
    const f = funcionarioPorId.get(fid);
    if (!f) continue;
    const folgas = 7 - datas.size;
    if (folgas < config.folgasMinimasSemana) {
      daSemana.push(
        folgas === 0 ? `${f.nome} está sem folga na semana` : `${f.nome} tem só ${folgas} folga na semana`,
      );
    }
  }

  // 3. Fechar um dia e abrir o seguinte
  if (config.bloquearFecharEAbrir && turnos.length > 1) {
    const ordenados = [...turnos].sort((a, b) => a.ordem - b.ordem);
    const primeiro = ordenados[0];
    const ultimo = ordenados[ordenados.length - 1];
    for (let i = 0; i < dias.length - 1; i++) {
      const hoje = dias[i];
      const amanha = dias[i + 1];
      const fecham = new Set(escalas.filter((e) => e.data === hoje && e.turno_id === ultimo.id).map((e) => e.funcionario_id));
      const abrem = escalas.filter((e) => e.data === amanha && e.turno_id === primeiro.id).map((e) => e.funcionario_id);
      for (const fid of abrem) {
        if (fecham.has(fid)) {
          const f = funcionarioPorId.get(fid);
          if (f) daSemana.push(`${f.nome} fecha ${rotuloCurto(hoje)} e abre ${rotuloCurto(amanha)}`);
        }
      }
    }
  }

  const total = [...porCelula.values()].reduce((s, a) => s + a.length, 0) + daSemana.length;
  return { porCelula, daSemana, total };
}

function rotuloCurto(iso: string) {
  const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return nomes[paraData(iso).getDay()];
}
