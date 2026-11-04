"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, variaveisConfiguradas } from "@/lib/supabase";
import { FUNCOES_PADRAO, type Regra, type Turno } from "@/lib/tipos";
import { DIAS_SEMANA } from "@/lib/datas";
import {
  CHAVE_FECHAR_ABRIR,
  CHAVE_FOLGAS,
  CONFIG_PADRAO,
  lerConfiguracoes,
  type ConfigRegras,
} from "@/lib/regras";

type Formulario = {
  id: string | null; // null = regra nova
  turno_id: string;
  dia: string; // "" = todos os dias; "0".."6" = dia da semana
  funcao: string;
  minimo: string;
};

type Dados = {
  turnos: Turno[];
  regras: Regra[];
  funcoesEquipe: string[];
  config: ConfigRegras;
};

function mensagemDeErro(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return String(e);
}

// Ordem dos dias na tela: segunda a domingo.
const ORDEM_DIAS = [1, 2, 3, 4, 5, 6, 0];

function nomeDia(dia: number | null): string {
  return dia === null ? "Todos os dias" : DIAS_SEMANA[dia];
}

async function buscarDados(): Promise<Dados | string> {
  if (!variaveisConfiguradas()) {
    return "O banco de dados não está configurado. Veja a página Início.";
  }
  try {
    const db = supabase();
    const [t, r, f, c] = await Promise.all([
      db.from("turnos").select("id, nome, hora_inicio, hora_fim, ordem").order("ordem"),
      db.from("regras").select("id, dia_semana, turno_id, funcao, minimo"),
      db.from("funcionarios").select("funcao"),
      db.from("configuracoes").select("chave, valor"),
    ]);
    if (t.error) throw t.error;
    if (r.error) throw r.error;
    if (f.error) throw f.error;
    if (c.error) throw c.error;
    return {
      turnos: t.data ?? [],
      regras: r.data ?? [],
      funcoesEquipe: (f.data ?? []).map((x: { funcao: string }) => x.funcao),
      config: lerConfiguracoes(c.data ?? []),
    };
  } catch (e) {
    return `Não foi possível carregar as regras. ${mensagemDeErro(e)}`;
  }
}

export default function RegrasDaCasa() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [funcoesEquipe, setFuncoesEquipe] = useState<string[]>([]);
  const [folgas, setFolgas] = useState(String(CONFIG_PADRAO.folgasMinimas));
  const [fecharAbrir, setFecharAbrir] = useState(CONFIG_PADRAO.bloquearFecharEAbrir);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);

  function aplicar(r: Dados | string) {
    if (typeof r === "string") {
      setErro(r);
    } else {
      setTurnos(r.turnos);
      setRegras(r.regras);
      setFuncoesEquipe(r.funcoesEquipe);
      setFolgas(String(r.config.folgasMinimas));
      setFecharAbrir(r.config.bloquearFecharEAbrir);
      setErro(null);
    }
    setCarregando(false);
  }

  async function carregar() {
    aplicar(await buscarDados());
  }

  useEffect(() => {
    let vivo = true;
    buscarDados().then((r) => {
      if (vivo) aplicar(r);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const funcoes = useMemo(() => {
    const todas = new Set(FUNCOES_PADRAO);
    funcoesEquipe.forEach((f) => todas.add(f));
    regras.forEach((r) => todas.add(r.funcao));
    return Array.from(todas).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [funcoesEquipe, regras]);

  // Regras agrupadas por turno; "todos os dias" primeiro, depois de segunda a domingo.
  function regrasDoTurno(turnoId: string): Regra[] {
    const posicao = (d: number | null) => (d === null ? -1 : ORDEM_DIAS.indexOf(d));
    return regras
      .filter((r) => r.turno_id === turnoId)
      .sort(
        (a, b) =>
          posicao(a.dia_semana) - posicao(b.dia_semana) ||
          a.funcao.localeCompare(b.funcao, "pt-BR"),
      );
  }

  function abrirNova() {
    setAviso(null);
    setFormulario({
      id: null,
      turno_id: turnos[0]?.id ?? "",
      dia: "",
      funcao: funcoes.includes("Salão") ? "Salão" : (funcoes[0] ?? ""),
      minimo: "1",
    });
  }

  function abrirEdicao(r: Regra) {
    setAviso(null);
    setFormulario({
      id: r.id,
      turno_id: r.turno_id,
      dia: r.dia_semana === null ? "" : String(r.dia_semana),
      funcao: r.funcao,
      minimo: String(r.minimo),
    });
  }

  async function salvarRegra(e: React.FormEvent) {
    e.preventDefault();
    if (!formulario) return;
    const minimo = Number(formulario.minimo);
    const dia_semana = formulario.dia === "" ? null : Number(formulario.dia);
    const funcao = formulario.funcao.trim();
    if (!formulario.turno_id || !funcao) {
      setErro("Escolha o turno e a função.");
      return;
    }
    if (!Number.isInteger(minimo) || minimo < 0) {
      setErro("O mínimo precisa ser um número inteiro, 0 ou mais.");
      return;
    }
    const repetida = regras.find(
      (r) =>
        r.id !== formulario.id &&
        r.turno_id === formulario.turno_id &&
        r.dia_semana === dia_semana &&
        r.funcao === funcao,
    );
    if (repetida) {
      setErro("Já existe uma regra para esse turno, dia e função. Altere a que já existe.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const db = supabase().from("regras");
      const valores = { turno_id: formulario.turno_id, dia_semana, funcao, minimo };
      const { error } = formulario.id
        ? await db.update(valores).eq("id", formulario.id)
        : await db.insert(valores);
      if (error) throw error;
      setFormulario(null);
      setAviso("Regra salva.");
      await carregar();
    } catch (e) {
      setErro(`Não foi possível salvar. ${mensagemDeErro(e)}`);
    } finally {
      setSalvando(false);
    }
  }

  async function removerRegra(r: Regra) {
    const turno = turnos.find((t) => t.id === r.turno_id)?.nome ?? "";
    if (!window.confirm(`Remover a regra: ${turno} · ${nomeDia(r.dia_semana)} · ${r.funcao}?`)) {
      return;
    }
    setAviso(null);
    try {
      const { error } = await supabase().from("regras").delete().eq("id", r.id);
      if (error) throw error;
      await carregar();
    } catch (e) {
      setErro(`Não foi possível remover. ${mensagemDeErro(e)}`);
    }
  }

  async function salvarOutras(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(folgas);
    if (!Number.isInteger(n) || n < 0 || n > 7) {
      setErro("As folgas por semana precisam ser um número de 0 a 7.");
      return;
    }
    setSalvando(true);
    setErro(null);
    setAviso(null);
    try {
      const { error } = await supabase()
        .from("configuracoes")
        .upsert(
          [
            { chave: CHAVE_FOLGAS, valor: String(n) },
            { chave: CHAVE_FECHAR_ABRIR, valor: fecharAbrir ? "true" : "false" },
          ],
          { onConflict: "chave" },
        );
      if (error) throw error;
      setAviso("Regras salvas.");
      await carregar();
    } catch (e) {
      setErro(`Não foi possível salvar. ${mensagemDeErro(e)}`);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Regras da casa</h1>
      <p className="text-neutral-600">
        A Escala da semana mostra um alerta em vermelho quando alguma destas regras não é
        cumprida. Os alertas só avisam: a escala pode ser salva mesmo assim.
      </p>

      {erro && (
        <p className="cartao border-red-300 bg-red-50 text-red-800" role="alert">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="cartao border-green-300 bg-green-50 text-green-800" role="status">
          {aviso}
        </p>
      )}

      {carregando ? (
        <p className="text-neutral-600">Carregando...</p>
      ) : (
        <>
          <form onSubmit={salvarOutras} className="cartao space-y-4">
            <h2 className="text-lg font-bold">Folgas e descanso</h2>
            <label className="block space-y-1">
              <span className="block font-semibold">Folgas mínimas por semana</span>
              <span className="block text-sm text-neutral-600">
                Dias sem nenhum turno que cada funcionário precisa ter. Use 0 para desligar.
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={7}
                className="campo"
                value={folgas}
                onChange={(e) => setFolgas(e.target.value)}
              />
            </label>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 h-6 w-6 shrink-0"
                checked={fecharAbrir}
                onChange={(e) => setFecharAbrir(e.target.checked)}
              />
              <span>
                <span className="block font-semibold">Ninguém fecha e abre no dia seguinte</span>
                <span className="block text-sm text-neutral-600">
                  Avisa quando alguém trabalha no último turno de um dia e no primeiro turno do
                  dia seguinte.
                </span>
              </span>
            </label>
            <button type="submit" className="botao w-full" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar folgas e descanso"}
            </button>
          </form>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Mínimo de pessoas por turno</h2>
              {!formulario && turnos.length > 0 && (
                <button type="button" className="botao w-full sm:w-auto" onClick={abrirNova}>
                  + Adicionar regra
                </button>
              )}
            </div>
            <p className="text-sm text-neutral-600">
              Uma regra de um dia específico (ex.: Sexta) vale no lugar da regra de &quot;Todos os
              dias&quot; para a mesma função e turno.
            </p>

            {formulario && (
              <form onSubmit={salvarRegra} className="cartao space-y-3">
                <p className="text-lg font-bold">
                  {formulario.id ? "Alterar regra" : "Nova regra"}
                </p>
                <label className="block space-y-1">
                  <span className="block font-semibold">Turno</span>
                  <select
                    className="campo"
                    value={formulario.turno_id}
                    onChange={(e) => setFormulario({ ...formulario, turno_id: e.target.value })}
                  >
                    {turnos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="block font-semibold">Dia</span>
                  <select
                    className="campo"
                    value={formulario.dia}
                    onChange={(e) => setFormulario({ ...formulario, dia: e.target.value })}
                  >
                    <option value="">Todos os dias</option>
                    {ORDEM_DIAS.map((d) => (
                      <option key={d} value={String(d)}>
                        {DIAS_SEMANA[d]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="block font-semibold">Função</span>
                  <select
                    className="campo"
                    value={formulario.funcao}
                    onChange={(e) => setFormulario({ ...formulario, funcao: e.target.value })}
                  >
                    {funcoes.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <span className="block font-semibold">Mínimo de pessoas</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="campo"
                    value={formulario.minimo}
                    onChange={(e) => setFormulario({ ...formulario, minimo: e.target.value })}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => setFormulario(null)}
                    disabled={salvando}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="botao" disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </form>
            )}

            {turnos.length === 0 && (
              <p className="cartao text-neutral-600">Nenhum turno cadastrado no banco.</p>
            )}

            {turnos.map((t) => {
              const lista = regrasDoTurno(t.id);
              return (
                <div key={t.id} className="cartao space-y-2">
                  <p className="text-lg font-bold">{t.nome}</p>
                  {lista.length === 0 ? (
                    <p className="text-neutral-600">Nenhuma regra para este turno.</p>
                  ) : (
                    <ul className="space-y-2">
                      {lista.map((r) => (
                        <li
                          key={r.id}
                          className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 p-3"
                        >
                          <span className="flex-1">
                            <span className="block font-semibold">
                              {r.funcao}: mínimo {r.minimo}
                            </span>
                            <span className="block text-sm text-neutral-600">
                              {nomeDia(r.dia_semana)}
                            </span>
                          </span>
                          <button
                            type="button"
                            className="botao-secundario"
                            onClick={() => abrirEdicao(r)}
                          >
                            Alterar
                          </button>
                          <button
                            type="button"
                            className="botao-secundario"
                            onClick={() => removerRegra(r)}
                          >
                            Remover
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
