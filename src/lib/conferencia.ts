// Compara a escala planejada de um dia com as marcações reais de ponto.
// Função pura: recebe dados, devolve o resultado da conferência.

import { horaCurta, horaParaMinutos } from "./datas";
import type { Marcacao } from "./integracoes/ponto";
import type { Configuracoes } from "./regras";
import type { Escala, Funcionario, Turno } from "./tipos";

export type Situacao = "No horário" | "Atrasado" | "Faltou" | "Hora extra" | "Sem CPF";

export type LinhaConferencia = {
  funcionario: Funcionario;
  turnos: string; // "Almoço, Jantar"
  planejadoInicio: string; // "11:00"
  planejadoFim: string; // "23:30"
  entradaReal: string | null;
  saidaReal: string | null;
  situacoes: Situacao[]; // pode ter mais de uma (atrasado e hora extra)
  principal: Situacao;
  minutosAtraso: number;
  minutosExtra: number;
};

export type NaoEscalado = {
  funcionario: Funcionario | null; // null = CPF que não está no cadastro
  cpf: string;
  entrada: string | null;
  saida: string | null;
};

export type ResultadoConferencia = {
  linhas: LinhaConferencia[];
  naoEscalados: NaoEscalado[];
  resumo: { atrasos: number; faltas: number; horasExtras: number; noHorario: number };
};

type Entrada = {
  escalasDoDia: Escala[];
  funcionarios: Funcionario[];
  turnos: Turno[];
  marcacoes: Marcacao[];
  config: Configuracoes;
};

export function conferir({ escalasDoDia, funcionarios, turnos, marcacoes, config }: Entrada): ResultadoConferencia {
  const funcionarioPorId = new Map(funcionarios.map((f) => [f.id, f]));
  const turnoPorId = new Map(turnos.map((t) => [t.id, t]));
  const marcacaoPorCpf = new Map(marcacoes.map((m) => [m.cpf, m]));

  // Agrupa a escala do dia por funcionário (quem faz dois turnos aparece uma vez)
  const porFuncionario = new Map<string, Turno[]>();
  for (const e of escalasDoDia) {
    const turno = turnoPorId.get(e.turno_id);
    if (!turno) continue;
    if (!porFuncionario.has(e.funcionario_id)) porFuncionario.set(e.funcionario_id, []);
    porFuncionario.get(e.funcionario_id)!.push(turno);
  }

  const linhas: LinhaConferencia[] = [];
  const cpfsEscalados = new Set<string>();

  for (const [fid, turnosDoDia] of porFuncionario) {
    const funcionario = funcionarioPorId.get(fid);
    if (!funcionario) continue;
    const ordenados = [...turnosDoDia].sort((a, b) => a.ordem - b.ordem);
    const inicio = horaCurta(ordenados[0].hora_inicio);
    const fim = horaCurta(ordenados[ordenados.length - 1].hora_fim);
    const cpf = funcionario.cpf ? funcionario.cpf.replace(/\D/g, "") : null;
    if (cpf) cpfsEscalados.add(cpf);
    const marcacao = cpf ? marcacaoPorCpf.get(cpf) : undefined;

    const situacoes: Situacao[] = [];
    let minutosAtraso = 0;
    let minutosExtra = 0;

    if (!cpf) {
      situacoes.push("Sem CPF"); // não dá para cruzar com o ponto
    } else if (!marcacao || !marcacao.entrada) {
      situacoes.push("Faltou");
    } else {
      const atraso = horaParaMinutos(marcacao.entrada) - horaParaMinutos(inicio);
      if (atraso > config.toleranciaAtrasoMinutos) {
        situacoes.push("Atrasado");
        minutosAtraso = atraso;
      }
      if (marcacao.saida) {
        const extra = horaParaMinutos(marcacao.saida) - horaParaMinutos(fim);
        if (extra > config.horaExtraMinutos) {
          situacoes.push("Hora extra");
          minutosExtra = extra;
        }
      }
      if (situacoes.length === 0) situacoes.push("No horário");
    }

    linhas.push({
      funcionario,
      turnos: ordenados.map((t) => t.nome).join(", "),
      planejadoInicio: inicio,
      planejadoFim: fim,
      entradaReal: marcacao?.entrada ?? null,
      saidaReal: marcacao?.saida ?? null,
      situacoes,
      principal: situacoes[0],
      minutosAtraso,
      minutosExtra,
    });
  }

  linhas.sort((a, b) => a.funcionario.nome.localeCompare(b.funcionario.nome));

  // Quem bateu ponto sem estar na escala do dia
  const funcionarioPorCpf = new Map(
    funcionarios.filter((f) => f.cpf).map((f) => [f.cpf!.replace(/\D/g, ""), f]),
  );
  const naoEscalados: NaoEscalado[] = marcacoes
    .filter((m) => !cpfsEscalados.has(m.cpf))
    .map((m) => ({
      funcionario: funcionarioPorCpf.get(m.cpf) ?? null,
      cpf: m.cpf,
      entrada: m.entrada,
      saida: m.saida,
    }));

  const resumo = {
    atrasos: linhas.filter((l) => l.situacoes.includes("Atrasado")).length,
    faltas: linhas.filter((l) => l.situacoes.includes("Faltou")).length,
    horasExtras: linhas.filter((l) => l.situacoes.includes("Hora extra")).length,
    noHorario: linhas.filter((l) => l.principal === "No horário").length,
  };

  return { linhas, naoEscalados, resumo };
}
