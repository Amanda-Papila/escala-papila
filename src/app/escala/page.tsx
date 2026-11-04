"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CelulaEscala } from "@/components/CelulaEscala";
import {
  adicionarNaEscala,
  listarConfiguracoes,
  listarEscalas,
  listarFuncionarios,
  listarRegras,
  listarTurnos,
  mensagemDeErro,
  removerDaEscala,
} from "@/lib/consultas";
import { CONFIG_PADRAO, calcularAlertas, chaveCelula, lerConfiguracoes, type Configuracoes } from "@/lib/regras";
import {
  DIAS_SEMANA_CURTO,
  diaMes,
  diasDaSemana,
  hojeISO,
  horaCurta,
  inicioDaSemana,
  paraData,
  rotuloDia,
  somarDias,
} from "@/lib/datas";
import type { Escala, Funcionario, Regra, Turno } from "@/lib/tipos";

export default function EscalaDaSemana() {
  const hoje = hojeISO();
  const [segunda, setSegunda] = useState(inicioDaSemana(hoje));
  const [diaSelecionado, setDiaSelecionado] = useState(hoje);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [config, setConfig] = useState<Configuracoes>(CONFIG_PADRAO);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const dias = useMemo(() => diasDaSemana(segunda), [segunda]);

  const carregar = useCallback(async () => {
    try {
      const [t, f, e, r, c] = await Promise.all([
        listarTurnos(),
        listarFuncionarios(),
        listarEscalas(segunda, somarDias(segunda, 6)),
        listarRegras(),
        listarConfiguracoes(),
      ]);
      setTurnos(t);
      setFuncionarios(f.filter((x) => x.ativo));
      setEscalas(e);
      setRegras(r);
      setConfig(lerConfiguracoes(c));
      setErro(null);
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setCarregando(false);
    }
  }, [segunda]);

  useEffect(() => {
    // Recarrega sempre que a semana muda.
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  function mudarSemana(dias: number) {
    const nova = somarDias(segunda, dias);
    setSegunda(nova);
    setDiaSelecionado(nova);
  }

  const porId = useMemo(() => new Map(funcionarios.map((f) => [f.id, f])), [funcionarios]);

  // Regras da casa aplicadas à semana em tela
  const alertas = useMemo(
    () => calcularAlertas({ dias, turnos, funcionarios, escalas, regras, config }),
    [dias, turnos, funcionarios, escalas, regras, config],
  );

  function atribuicoes(data: string, turnoId: string) {
    return escalas
      .filter((e) => e.data === data && e.turno_id === turnoId)
      .map((escala) => ({ escala, funcionario: porId.get(escala.funcionario_id) }))
      .filter((x): x is { escala: Escala; funcionario: Funcionario } => Boolean(x.funcionario))
      .sort((a, b) => a.funcionario.nome.localeCompare(b.funcionario.nome));
  }

  function disponiveis(data: string, turnoId: string) {
    const jaEscalados = new Set(atribuicoes(data, turnoId).map((a) => a.funcionario.id));
    return funcionarios.filter((f) => !jaEscalados.has(f.id));
  }

  async function adicionar(data: string, turnoId: string, funcionarioId: string) {
    try {
      await adicionarNaEscala(data, turnoId, funcionarioId);
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  async function remover(escalaId: string) {
    try {
      await removerDaEscala(escalaId);
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  function celula(data: string, turno: Turno) {
    return (
      <CelulaEscala
        atribuicoes={atribuicoes(data, turno.id)}
        disponiveis={disponiveis(data, turno.id)}
        onAdicionar={(fid) => adicionar(data, turno.id, fid)}
        onRemover={remover}
        alertas={alertas.porCelula.get(chaveCelula(data, turno.id)) ?? []}
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Escala da semana</h1>

      <div className="flex items-center justify-between gap-2">
        <button className="botao-secundario px-3" onClick={() => mudarSemana(-7)} aria-label="Semana anterior">←</button>
        <div className="text-center">
          <p className="font-semibold">{diaMes(segunda)} a {diaMes(somarDias(segunda, 6))}</p>
          <button className="text-sm text-neutral-600 underline" onClick={() => { setSegunda(inicioDaSemana(hoje)); setDiaSelecionado(hoje); }}>
            ir para hoje
          </button>
        </div>
        <button className="botao-secundario px-3" onClick={() => mudarSemana(7)} aria-label="Próxima semana">→</button>
      </div>

      {erro && <p className="rounded-xl bg-red-50 p-3 text-red-700">{erro}</p>}
      {carregando && <p className="text-neutral-600">Carregando...</p>}

      {!carregando && (
        <section className={`cartao ${alertas.total > 0 ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
          <p className={`font-semibold ${alertas.total > 0 ? "text-red-800" : "text-green-800"}`}>
            {alertas.total === 0
              ? "Semana sem alertas"
              : `${alertas.total} alerta${alertas.total > 1 ? "s" : ""} nesta semana`}
          </p>
          {alertas.daSemana.length > 0 && (
            <ul className="mt-2 list-inside list-disc text-sm text-red-800">
              {alertas.daSemana.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          {alertas.porCelula.size > 0 && (
            <p className="mt-2 text-sm text-red-800">
              Turnos com gente de menos estão em vermelho na grade.
            </p>
          )}
        </section>
      )}

      {!carregando && funcionarios.length === 0 && (
        <p className="cartao text-neutral-700">Cadastre a equipe primeiro, na tela Equipe.</p>
      )}

      {/* Celular: um dia por vez */}
      <div className="md:hidden">
        <div className="mb-3 grid grid-cols-7 gap-1">
          {dias.map((d) => {
            const ativo = d === diaSelecionado;
            return (
              <button
                key={d}
                onClick={() => setDiaSelecionado(d)}
                className={`rounded-lg py-2 text-center text-xs font-semibold ${
                  ativo ? "text-white" : "bg-white text-neutral-700"
                } ${d === hoje ? "ring-2 ring-neutral-400" : ""}`}
                style={ativo ? { background: "var(--cor-principal)" } : undefined}
              >
                {DIAS_SEMANA_CURTO[paraData(d).getDay()]}
                <br />
                {diaMes(d).slice(0, 2)}
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {turnos.map((t) => (
            <section key={t.id}>
              <h2 className="mb-1 text-sm font-semibold text-neutral-700">
                {t.nome} · {horaCurta(t.hora_inicio)} às {horaCurta(t.hora_fim)} · {rotuloDia(diaSelecionado)}
              </h2>
              {celula(diaSelecionado, t)}
            </section>
          ))}
        </div>
      </div>

      {/* Telas maiores: a semana inteira */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[900px] border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="w-24 text-left text-sm text-neutral-600">Turno</th>
              {dias.map((d) => (
                <th key={d} className={`text-sm ${d === hoje ? "font-bold" : "font-semibold text-neutral-700"}`}>
                  {rotuloDia(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {turnos.map((t) => (
              <tr key={t.id}>
                <th className="align-top text-left text-sm font-semibold">
                  {t.nome}
                  <br />
                  <span className="font-normal text-neutral-500">
                    {horaCurta(t.hora_inicio)} às {horaCurta(t.hora_fim)}
                  </span>
                </th>
                {dias.map((d) => (
                  <td key={d} className="align-top">
                    {celula(d, t)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
