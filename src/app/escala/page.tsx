"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, variaveisConfiguradas } from "@/lib/supabase";
import type { Escala, Funcionario, Regra, Turno } from "@/lib/tipos";
import {
  CONFIG_PADRAO,
  chaveCelula,
  lerConfiguracoes,
  verificarSemana,
  type Alerta,
  type ConfigRegras,
} from "@/lib/regras";
import {
  DIAS_SEMANA,
  diaMes,
  diasDaSemana,
  hojeISO,
  horaCurta,
  inicioDaSemana,
  paraData,
  rotuloDia,
  somarDias,
} from "@/lib/datas";

type CelulaAberta = { data: string; turno: Turno };

function mensagemDeErro(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return String(e);
}

async function buscarEscalas(de: string, ate: string): Promise<Escala[] | string> {
  if (!variaveisConfiguradas()) return [];
  try {
    const { data, error } = await supabase()
      .from("escalas")
      .select("id, data, turno_id, funcionario_id")
      .gte("data", de)
      .lte("data", ate);
    if (error) throw error;
    return data ?? [];
  } catch (e) {
    return `Não foi possível carregar a escala. ${mensagemDeErro(e)}`;
  }
}

export default function EscalaDaSemana() {
  const [segunda, setSegunda] = useState(() => inicioDaSemana(hojeISO()));
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aberta, setAberta] = useState<CelulaAberta | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [configRegras, setConfigRegras] = useState<ConfigRegras>(CONFIG_PADRAO);
  const [verAlertas, setVerAlertas] = useState(false);

  const dias = diasDaSemana(segunda);
  const domingo = dias[6];
  const semanaAtual = inicioDaSemana(hojeISO());
  // Busca também o domingo anterior e a segunda seguinte para a regra "fecha e abre".
  const buscaDe = somarDias(segunda, -1);
  const buscaAte = somarDias(domingo, 1);

  // Turnos e funcionários: carregados uma vez.
  useEffect(() => {
    async function carregarBase() {
      if (!variaveisConfiguradas()) {
        setErro("O banco de dados não está configurado. Veja a página Início.");
        setCarregando(false);
        return;
      }
      try {
        const db = supabase();
        const [t, f] = await Promise.all([
          db.from("turnos").select("id, nome, hora_inicio, hora_fim, ordem").order("ordem"),
          db.from("funcionarios").select("id, nome, funcao, telefone, cpf, ativo").order("nome"),
        ]);
        if (t.error) throw t.error;
        if (f.error) throw f.error;
        setTurnos(t.data ?? []);
        setFuncionarios(f.data ?? []);
      } catch (e) {
        setErro(`Não foi possível carregar turnos e equipe. ${mensagemDeErro(e)}`);
        return;
      }
      // Regras da casa: se falhar, a escala continua funcionando.
      try {
        const db = supabase();
        const [r, c] = await Promise.all([
          db.from("regras").select("id, dia_semana, turno_id, funcao, minimo"),
          db.from("configuracoes").select("chave, valor"),
        ]);
        if (r.error) throw r.error;
        if (c.error) throw c.error;
        setRegras(r.data ?? []);
        setConfigRegras(lerConfiguracoes(c.data ?? []));
      } catch (e) {
        setErro(`Não foi possível carregar as regras da casa. ${mensagemDeErro(e)}`);
      }
    }
    carregarBase();
  }, []);

  // Escala da semana: recarregada ao trocar de semana.
  function aplicarEscalas(r: Escala[] | string) {
    if (typeof r === "string") setErro(r);
    else setEscalas(r);
    setCarregando(false);
  }

  async function carregarEscalas() {
    aplicarEscalas(await buscarEscalas(buscaDe, buscaAte));
  }

  useEffect(() => {
    let vivo = true;
    buscarEscalas(buscaDe, buscaAte).then((r) => {
      if (vivo) aplicarEscalas(r);
    });
    return () => {
      vivo = false;
    };
  }, [buscaDe, buscaAte]);

  function irParaSemana(novaSegunda: string) {
    if (novaSegunda === segunda) return;
    setCarregando(true);
    setSegunda(novaSegunda);
  }

  function escalados(data: string, turnoId: string): Funcionario[] {
    const ids = new Set(
      escalas
        .filter((e) => e.data === data && e.turno_id === turnoId)
        .map((e) => e.funcionario_id),
    );
    return funcionarios.filter((f) => ids.has(f.id));
  }

  async function alternar(funcionario: Funcionario) {
    if (!aberta) return;
    const { data, turno } = aberta;
    const existente = escalas.find(
      (e) => e.data === data && e.turno_id === turno.id && e.funcionario_id === funcionario.id,
    );
    setSalvandoId(funcionario.id);
    setErro(null);
    try {
      if (existente) {
        const { error } = await supabase().from("escalas").delete().eq("id", existente.id);
        if (error) throw error;
        setEscalas((lista) => lista.filter((e) => e.id !== existente.id));
      } else {
        const { data: nova, error } = await supabase()
          .from("escalas")
          .insert({ data, turno_id: turno.id, funcionario_id: funcionario.id })
          .select("id, data, turno_id, funcionario_id")
          .single();
        if (error) throw error;
        setEscalas((lista) => [...lista, nova]);
      }
    } catch (e) {
      setErro(`Não foi possível salvar. ${mensagemDeErro(e)}`);
      await carregarEscalas();
    } finally {
      setSalvandoId(null);
    }
  }

  // Alertas das regras da casa, recalculados a cada mudança na escala.
  const alertas: Alerta[] = carregando
    ? []
    : verificarSemana({ dias, turnos, funcionarios, escalas, regras, config: configRegras });
  const alertasPorCelula = new Map<string, Alerta[]>();
  for (const a of alertas) {
    for (const c of a.celulas) {
      const k = chaveCelula(c.data, c.turnoId);
      alertasPorCelula.set(k, [...(alertasPorCelula.get(k) ?? []), a]);
    }
  }

  // Na lista de escolha: ativos, mais quem já está escalado mesmo se desativado.
  const escaladosNaAberta = aberta ? escalados(aberta.data, aberta.turno.id) : [];
  const idsNaAberta = new Set(escaladosNaAberta.map((f) => f.id));
  const opcoes = funcionarios.filter((f) => f.ativo || idsNaAberta.has(f.id));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Escala da semana</h1>

      <div className="cartao space-y-3">
        <p className="text-center text-lg font-semibold">
          {diaMes(segunda)} a {diaMes(domingo)}/{domingo.slice(0, 4)}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="botao-secundario"
            onClick={() => irParaSemana(somarDias(segunda, -7))}
          >
            ◀ Anterior
          </button>
          <button
            type="button"
            className="botao-secundario"
            onClick={() => irParaSemana(somarDias(segunda, 7))}
          >
            Próxima ▶
          </button>
        </div>
        {segunda !== semanaAtual && (
          <button
            type="button"
            className="botao w-full"
            onClick={() => irParaSemana(semanaAtual)}
          >
            Voltar para a semana atual
          </button>
        )}
      </div>

      {erro && (
        <p className="cartao border-red-300 bg-red-50 text-red-800" role="alert">
          {erro}
        </p>
      )}

      {!carregando && turnos.length > 0 && (
        <div
          className={`cartao ${
            alertas.length > 0 ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"
          }`}
          role="status"
        >
          {alertas.length === 0 ? (
            <p className="font-semibold text-green-800">✓ Nenhum alerta nesta semana</p>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setVerAlertas((v) => !v)}
                className="flex w-full items-center justify-between gap-2 text-left font-semibold text-red-800"
              >
                <span>
                  ⚠ {alertas.length} {alertas.length === 1 ? "alerta" : "alertas"} nesta semana
                </span>
                <span className="text-sm font-normal underline">
                  {verAlertas ? "Esconder" : "Ver lista"}
                </span>
              </button>
              {verAlertas && (
                <ul className="mt-3 space-y-1 text-sm text-red-900">
                  {alertas.map((a, i) => (
                    <li key={i}>• {a.completo}</li>
                  ))}
                </ul>
              )}
            </>
          )}
          <Link href="/regras" className="mt-2 block text-sm text-neutral-600 underline">
            Ver ou mudar as regras da casa
          </Link>
        </div>
      )}

      <p className="text-sm text-neutral-600">
        Toque num quadro para escolher quem trabalha. Arraste a grade para o lado para ver
        todos os dias.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              <th className="sticky left-0 z-[1] min-w-[84px] border-b border-r border-neutral-200 bg-neutral-50 p-2 text-sm">
                Turno
              </th>
              {dias.map((d) => (
                <th
                  key={d}
                  className={`min-w-[112px] border-b border-neutral-200 p-2 text-center text-sm ${
                    d === hojeISO() ? "bg-amber-50" : "bg-neutral-50"
                  }`}
                >
                  {rotuloDia(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {turnos.map((turno) => (
              <tr key={turno.id}>
                <th className="sticky left-0 z-[1] border-r border-b border-neutral-200 bg-white p-2 align-top">
                  <span className="block font-semibold">{turno.nome}</span>
                  <span className="block text-xs font-normal text-neutral-500">
                    {horaCurta(turno.hora_inicio)}–{horaCurta(turno.hora_fim)}
                  </span>
                </th>
                {dias.map((d) => {
                  const pessoas = escalados(d, turno.id);
                  const avisos = alertasPorCelula.get(chaveCelula(d, turno.id)) ?? [];
                  const emAlerta = new Set(
                    avisos.map((a) => a.funcionarioId).filter((id): id is string => !!id),
                  );
                  return (
                    <td key={d} className="border-b border-neutral-200 p-1 align-top">
                      <button
                        type="button"
                        onClick={() => setAberta({ data: d, turno })}
                        disabled={carregando}
                        className={`flex min-h-[88px] w-full flex-col items-start gap-1 rounded-lg p-2 text-left text-sm disabled:opacity-50 ${
                          avisos.length > 0
                            ? "border-2 border-red-400 bg-red-50 active:bg-red-100"
                            : "active:bg-neutral-100"
                        }`}
                      >
                        {pessoas.length === 0 ? (
                          <span className="text-neutral-400">+ Escolher</span>
                        ) : (
                          pessoas.map((p) => (
                            <span
                              key={p.id}
                              className={`w-full rounded-md px-2 py-1 leading-tight ${
                                emAlerta.has(p.id)
                                  ? "bg-red-200 font-semibold text-red-900"
                                  : "bg-neutral-100"
                              }`}
                            >
                              {p.nome.split(" ")[0]}
                            </span>
                          ))
                        )}
                        {avisos.map((a, i) => (
                          <span
                            key={i}
                            className="text-xs font-semibold leading-tight text-red-700"
                          >
                            ⚠ {a.curto}
                          </span>
                        ))}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {turnos.length === 0 && !carregando && (
          <p className="p-4 text-neutral-600">Nenhum turno cadastrado no banco.</p>
        )}
      </div>

      {aberta && (
        <div
          className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setAberta(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-t-2xl bg-white sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="border-b border-neutral-200 p-4">
              <p className="text-lg font-bold">
                {DIAS_SEMANA[paraData(aberta.data).getDay()]} {diaMes(aberta.data)} ·{" "}
                {aberta.turno.nome}
              </p>
              <p className="text-sm text-neutral-600">
                {escaladosNaAberta.length} escalado(s). Toque para marcar ou desmarcar.
              </p>
            </div>
            <ul className="flex-1 space-y-2 overflow-y-auto p-4">
              {opcoes.map((f) => {
                const marcado = idsNaAberta.has(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => alternar(f)}
                      disabled={salvandoId !== null}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-base disabled:opacity-60 ${
                        marcado ? "border-transparent text-white" : "border-neutral-300 bg-white"
                      }`}
                      style={marcado ? { background: "var(--cor-principal)" } : undefined}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 font-bold ${
                          marcado ? "border-white" : "border-neutral-400"
                        }`}
                      >
                        {marcado ? "✓" : ""}
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold">{f.nome}</span>
                        <span className={`block text-sm ${marcado ? "text-white/80" : "text-neutral-600"}`}>
                          {f.funcao}
                          {!f.ativo ? " · desativado" : ""}
                        </span>
                      </span>
                      {salvandoId === f.id && <span className="text-sm">Salvando...</span>}
                    </button>
                  </li>
                );
              })}
              {opcoes.length === 0 && (
                <li className="text-neutral-600">Nenhum funcionário ativo na equipe.</li>
              )}
            </ul>
            <div className="border-t border-neutral-200 p-4">
              <button type="button" className="botao w-full" onClick={() => setAberta(null)}>
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
