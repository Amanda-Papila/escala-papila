"use client";

import { useEffect, useState } from "react";
import {
  criarRegra,
  excluirRegra,
  listarConfiguracoes,
  listarRegras,
  listarTurnos,
  mensagemDeErro,
  salvarConfiguracao,
} from "@/lib/consultas";
import { DIAS_SEMANA } from "@/lib/datas";
import { CONFIG_PADRAO, lerConfiguracoes, type Configuracoes } from "@/lib/regras";
import { FUNCOES_PADRAO, type Regra, type Turno } from "@/lib/tipos";

export default function Regras() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [config, setConfig] = useState<Configuracoes>(CONFIG_PADRAO);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [nova, setNova] = useState({ dia_semana: "todos", turno_id: "", funcao: FUNCOES_PADRAO[0], minimo: 1 });

  async function carregar() {
    try {
      const [t, r, c] = await Promise.all([listarTurnos(), listarRegras(), listarConfiguracoes()]);
      setTurnos(t);
      setRegras(r);
      setConfig(lerConfiguracoes(c));
      setNova((n) => ({ ...n, turno_id: n.turno_id || t[0]?.id || "" }));
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    }
  }

  useEffect(() => {
    // Carrega as regras ao abrir a tela.
    void (async () => {
      await carregar();
    })();
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    try {
      await criarRegra({
        dia_semana: nova.dia_semana === "todos" ? null : Number(nova.dia_semana),
        turno_id: nova.turno_id,
        funcao: nova.funcao.trim(),
        minimo: Number(nova.minimo),
      });
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  async function remover(id: string) {
    try {
      await excluirRegra(id);
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  async function salvarConfig(chave: string, valor: string) {
    try {
      await salvarConfiguracao(chave, valor);
      await carregar();
      setAviso("Configuração salva.");
      setTimeout(() => setAviso(null), 2000);
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  const nomeTurno = (id: string) => turnos.find((t) => t.id === id)?.nome ?? "?";
  const nomeDia = (d: number | null) => (d === null ? "Todos os dias" : DIAS_SEMANA[d]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Regras da casa</h1>
      {erro && <p className="rounded-xl bg-red-50 p-3 text-red-700">{erro}</p>}
      {aviso && <p className="rounded-xl bg-green-50 p-3 text-green-700">{aviso}</p>}

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Mínimo de pessoas por turno e função</h2>
        <p className="text-sm text-neutral-600">
          Uma regra de um dia específico vale mais que a regra de todos os dias.
        </p>
        <ul className="divide-y divide-neutral-200">
          {regras.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{nomeDia(r.dia_semana)}</span> · {nomeTurno(r.turno_id)} · mínimo{" "}
                <span className="font-semibold">{r.minimo}</span> em {r.funcao}
              </span>
              <button className="botao-secundario px-3 py-1.5 text-sm" onClick={() => remover(r.id)}>Excluir</button>
            </li>
          ))}
          {regras.length === 0 && <li className="py-2 text-neutral-600">Nenhuma regra ainda.</li>}
        </ul>

        <form onSubmit={adicionar} className="grid grid-cols-2 gap-2 border-t border-neutral-200 pt-3">
          <label className="text-sm font-medium">
            Dia
            <select className="campo mt-1" value={nova.dia_semana} onChange={(e) => setNova({ ...nova, dia_semana: e.target.value })}>
              <option value="todos">Todos os dias</option>
              {DIAS_SEMANA.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Turno
            <select className="campo mt-1" value={nova.turno_id} onChange={(e) => setNova({ ...nova, turno_id: e.target.value })}>
              {turnos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Função
            <input className="campo mt-1" list="funcoes" value={nova.funcao} onChange={(e) => setNova({ ...nova, funcao: e.target.value })} required />
            <datalist id="funcoes">
              {FUNCOES_PADRAO.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <label className="text-sm font-medium">
            Mínimo
            <input className="campo mt-1" type="number" min={1} max={50} value={nova.minimo} onChange={(e) => setNova({ ...nova, minimo: Number(e.target.value) })} required />
          </label>
          <button type="submit" className="botao col-span-2">Adicionar regra</button>
        </form>
      </section>

      <section className="cartao space-y-3">
        <h2 className="font-semibold">Outras regras</h2>
        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Folgas mínimas por semana
          <input
            className="campo w-24"
            type="number"
            min={0}
            max={7}
            value={config.folgasMinimasSemana}
            onChange={(e) => salvarConfig("folgas_minimas_semana", e.target.value)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Avisar quando alguém fecha um dia e abre o seguinte
          <input
            type="checkbox"
            className="h-6 w-6"
            checked={config.bloquearFecharEAbrir}
            onChange={(e) => salvarConfig("bloquear_fechar_e_abrir", String(e.target.checked))}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Tolerância de atraso (minutos)
          <input
            className="campo w-24"
            type="number"
            min={0}
            max={120}
            value={config.toleranciaAtrasoMinutos}
            onChange={(e) => salvarConfig("tolerancia_atraso_minutos", e.target.value)}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-sm font-medium">
          Hora extra a partir de (minutos após o fim do turno)
          <input
            className="campo w-24"
            type="number"
            min={0}
            max={240}
            value={config.horaExtraMinutos}
            onChange={(e) => salvarConfig("hora_extra_minutos", e.target.value)}
          />
        </label>
      </section>
    </div>
  );
}
