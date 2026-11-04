// Regras da casa: verifica a escala da semana e devolve os alertas.
// Não acessa o banco; só faz as contas. As regras vêm das tabelas
// `regras` (mínimo por turno, dia e função) e `configuracoes`
// (folgas mínimas e "fechar e abrir"), editáveis na tela Regras da casa.

import type { Configuracao, Escala, Funcionario, Regra, Turno } from "@/lib/tipos";
import { paraData, rotuloDia, somarDias } from "@/lib/datas";

export type ConfigRegras = {
  folgasMinimas: number;
  bloquearFecharEAbrir: boolean;
};

export const CONFIG_PADRAO: ConfigRegras = {
  folgasMinimas: 1,
  bloquearFecharEAbrir: true,
};

export const CHAVE_FOLGAS = "folgas_minimas_semana";
export const CHAVE_FECHAR_ABRIR = "bloquear_fechar_e_abrir";

/** Converte as linhas da tabela `configuracoes` nas configurações das regras. */
export function lerConfiguracoes(lista: Configuracao[]): ConfigRegras {
  const valor = (chave: string) => lista.find((c) => c.chave === chave)?.valor;
  const folgas = Number(valor(CHAVE_FOLGAS));
  const fecharAbrir = valor(CHAVE_FECHAR_ABRIR);
  return {
    folgasMinimas: Number.isFinite(folgas) && folgas >= 0 ? folgas : CONFIG_PADRAO.folgasMinimas,
    bloquearFecharEAbrir:
      fecharAbrir === undefined ? CONFIG_PADRAO.bloquearFecharEAbrir : fecharAbrir === "true",
  };
}

export type TipoAlerta = "minimo" | "folga" | "fechar_abrir";

export type Alerta = {
  tipo: TipoAlerta;
  /** Texto curto, mostrado dentro do quadro da grade. */
  curto: string;
  /** Texto completo, mostrado no resumo do topo. */
  completo: string;
  /** Quadros da grade afetados (só dias da semana exibida). */
  celulas: { data: string; turnoId: string }[];
  /** Funcionário envolvido, quando houver. */
  funcionarioId?: string;
};

export function chaveCelula(data: string, turnoId: string): string {
  return `${data}|${turnoId}`;
}

function primeiroNome(f: Funcionario): string {
  return f.nome.split(" ")[0];
}

type Entrada = {
  dias: string[]; // os 7 dias da semana exibida (segunda a domingo)
  turnos: Turno[];
  funcionarios: Funcionario[];
  escalas: Escala[]; // pode incluir o domingo anterior e a segunda seguinte
  regras: Regra[];
  config: ConfigRegras;
};

export function verificarSemana({
  dias,
  turnos,
  funcionarios,
  escalas,
  regras,
  config,
}: Entrada): Alerta[] {
  const alertas: Alerta[] = [];
  const porId = new Map(funcionarios.map((f) => [f.id, f]));
  const naSemana = new Set(dias);

  function idsEscalados(data: string, turnoId: string): string[] {
    return escalas
      .filter((e) => e.data === data && e.turno_id === turnoId)
      .map((e) => e.funcionario_id);
  }

  // 1. Mínimo de pessoas por turno e função.
  // Uma regra de um dia específico vale no lugar da regra de "todos os dias"
  // para a mesma função e turno.
  for (const data of dias) {
    const diaSemana = paraData(data).getDay();
    for (const turno of turnos) {
      const doTurno = regras.filter((r) => r.turno_id === turno.id);
      const minimos = new Map<string, number>();
      doTurno.filter((r) => r.dia_semana === null).forEach((r) => minimos.set(r.funcao, r.minimo));
      doTurno
        .filter((r) => r.dia_semana === diaSemana)
        .forEach((r) => minimos.set(r.funcao, r.minimo));

      const ids = idsEscalados(data, turno.id);
      for (const [funcao, minimo] of minimos) {
        const qtd = ids.filter((id) => porId.get(id)?.funcao === funcao).length;
        if (qtd < minimo) {
          const falta = minimo - qtd;
          alertas.push({
            tipo: "minimo",
            curto: `${funcao}: falta ${falta}`,
            completo: `${rotuloDia(data)} · ${turno.nome} · ${funcao}: ${qtd} de ${minimo}`,
            celulas: [{ data, turnoId: turno.id }],
          });
        }
      }
    }
  }

  // 2. Folga mínima na semana (só funcionários ativos).
  if (config.folgasMinimas > 0) {
    for (const f of funcionarios.filter((x) => x.ativo)) {
      const diasTrabalhados = new Set(
        escalas.filter((e) => e.funcionario_id === f.id && naSemana.has(e.data)).map((e) => e.data),
      );
      const folgas = dias.length - diasTrabalhados.size;
      if (folgas < config.folgasMinimas) {
        alertas.push({
          tipo: "folga",
          curto: `${primeiroNome(f)} sem folga`,
          completo:
            folgas === 0
              ? `${f.nome} não tem nenhuma folga na semana`
              : `${f.nome} tem ${folgas} folga(s); o mínimo é ${config.folgasMinimas}`,
          celulas: [],
          funcionarioId: f.id,
        });
      }
    }
  }

  // 3. Ninguém fecha um dia (último turno) e abre o seguinte (primeiro turno).
  // Confere também a virada da semana: domingo anterior → segunda e domingo → segunda seguinte.
  if (config.bloquearFecharEAbrir && turnos.length >= 2) {
    const ordenados = [...turnos].sort((a, b) => a.ordem - b.ordem);
    const abertura = ordenados[0];
    const fechamento = ordenados[ordenados.length - 1];
    const todosOsDias = [somarDias(dias[0], -1), ...dias, somarDias(dias[dias.length - 1], 1)];

    for (let i = 0; i < todosOsDias.length - 1; i++) {
      const hoje = todosOsDias[i];
      const amanha = todosOsDias[i + 1];
      if (!naSemana.has(hoje) && !naSemana.has(amanha)) continue;
      const abrem = new Set(idsEscalados(amanha, abertura.id));
      for (const id of idsEscalados(hoje, fechamento.id)) {
        if (!abrem.has(id)) continue;
        const f = porId.get(id);
        if (!f) continue;
        alertas.push({
          tipo: "fechar_abrir",
          curto: `${primeiroNome(f)} fecha e abre`,
          completo: `${f.nome} fecha ${rotuloDia(hoje)} (${fechamento.nome}) e abre ${rotuloDia(amanha)} (${abertura.nome})`,
          celulas: [
            { data: hoje, turnoId: fechamento.id },
            { data: amanha, turnoId: abertura.id },
          ].filter((c) => naSemana.has(c.data)),
          funcionarioId: id,
        });
      }
    }
  }

  return alertas;
}
