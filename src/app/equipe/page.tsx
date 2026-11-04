"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase, variaveisConfiguradas } from "@/lib/supabase";
import { FUNCOES_PADRAO, type Funcionario } from "@/lib/tipos";

type Formulario = {
  id: string | null; // null = funcionário novo
  nome: string;
  funcao: string;
  telefone: string;
};

const FORMULARIO_VAZIO: Formulario = { id: null, nome: "", funcao: "", telefone: "" };

function mensagemDeErro(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return String(e);
}

type Resultado = { funcionarios: Funcionario[] } | { erro: string };

async function buscarEquipe(): Promise<Resultado> {
  if (!variaveisConfiguradas()) {
    return { erro: "O banco de dados não está configurado. Veja a página Início." };
  }
  try {
    const { data, error } = await supabase()
      .from("funcionarios")
      .select("id, nome, funcao, telefone, cpf, ativo")
      .order("nome");
    if (error) throw error;
    return { funcionarios: data ?? [] };
  } catch (e) {
    return { erro: `Não foi possível carregar a equipe. ${mensagemDeErro(e)}` };
  }
}

export default function Equipe() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);

  function aplicar(r: Resultado) {
    if ("erro" in r) {
      setErro(r.erro);
    } else {
      setFuncionarios(r.funcionarios);
      setErro(null);
    }
    setCarregando(false);
  }

  async function carregar() {
    aplicar(await buscarEquipe());
  }

  useEffect(() => {
    let vivo = true;
    buscarEquipe().then((r) => {
      if (vivo) aplicar(r);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const ativos = funcionarios.filter((f) => f.ativo);
  const inativos = funcionarios.filter((f) => !f.ativo);

  // Funções padrão + qualquer função que já exista no banco.
  const funcoes = useMemo(() => {
    const todas = new Set(FUNCOES_PADRAO);
    funcionarios.forEach((f) => todas.add(f.funcao));
    return Array.from(todas).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [funcionarios]);

  function abrirNovo() {
    setFormulario({ ...FORMULARIO_VAZIO, funcao: funcoes[0] ?? "" });
  }

  function abrirEdicao(f: Funcionario) {
    setFormulario({ id: f.id, nome: f.nome, funcao: f.funcao, telefone: f.telefone ?? "" });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!formulario) return;
    const nome = formulario.nome.trim();
    const funcao = formulario.funcao.trim();
    const telefone = formulario.telefone.trim() || null;
    if (!nome || !funcao) {
      setErro("Preencha o nome e a função.");
      return;
    }
    setSalvando(true);
    try {
      const db = supabase().from("funcionarios");
      const { error } = formulario.id
        ? await db.update({ nome, funcao, telefone }).eq("id", formulario.id)
        : await db.insert({ nome, funcao, telefone });
      if (error) throw error;
      setFormulario(null);
      await carregar();
    } catch (e) {
      setErro(`Não foi possível salvar. ${mensagemDeErro(e)}`);
    } finally {
      setSalvando(false);
    }
  }

  async function mudarAtivo(f: Funcionario, ativo: boolean) {
    if (!ativo && !window.confirm(`Desativar ${f.nome}? Ele(a) deixa de aparecer na escala.`)) {
      return;
    }
    try {
      const { error } = await supabase().from("funcionarios").update({ ativo }).eq("id", f.id);
      if (error) throw error;
      await carregar();
    } catch (e) {
      setErro(`Não foi possível alterar. ${mensagemDeErro(e)}`);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Equipe</h1>
        {!formulario && (
          <button type="button" className="botao w-full sm:w-auto" onClick={abrirNovo}>
            + Adicionar funcionário
          </button>
        )}
      </div>

      {erro && (
        <p className="cartao border-red-300 bg-red-50 text-red-800" role="alert">
          {erro}
        </p>
      )}

      {formulario && (
        <form onSubmit={salvar} className="cartao space-y-4">
          <h2 className="text-lg font-semibold">
            {formulario.id ? "Editar funcionário" : "Novo funcionário"}
          </h2>
          <label className="block">
            <span className="mb-1 block font-medium">Nome</span>
            <input
              className="campo"
              value={formulario.nome}
              onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
              autoComplete="off"
              required
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Função</span>
            <select
              className="campo"
              value={formulario.funcao}
              onChange={(e) => setFormulario({ ...formulario, funcao: e.target.value })}
              required
            >
              {funcoes.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Telefone</span>
            <input
              className="campo"
              type="tel"
              inputMode="tel"
              placeholder="(11) 90000-0000"
              value={formulario.telefone}
              onChange={(e) => setFormulario({ ...formulario, telefone: e.target.value })}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" className="botao flex-1" disabled={salvando}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              className="botao-secundario flex-1"
              onClick={() => setFormulario(null)}
              disabled={salvando}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="text-neutral-600">Carregando...</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Ativos ({ativos.length})</h2>
            {ativos.length === 0 && (
              <p className="text-neutral-600">Nenhum funcionário ativo.</p>
            )}
            {ativos.map((f) => (
              <article key={f.id} className="cartao space-y-3">
                <div>
                  <p className="text-lg font-semibold">{f.nome}</p>
                  <p className="text-neutral-700">{f.funcao}</p>
                  {f.telefone ? (
                    <a
                      href={`tel:${f.telefone.replace(/[^\d+]/g, "")}`}
                      className="text-base underline"
                      style={{ color: "var(--cor-principal)" }}
                    >
                      {f.telefone}
                    </a>
                  ) : (
                    <p className="text-neutral-500">Sem telefone</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="botao-secundario flex-1"
                    onClick={() => abrirEdicao(f)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="botao-secundario flex-1"
                    onClick={() => mudarAtivo(f, false)}
                  >
                    Desativar
                  </button>
                </div>
              </article>
            ))}
          </section>

          {inativos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-neutral-600">
                Desativados ({inativos.length})
              </h2>
              {inativos.map((f) => (
                <article
                  key={f.id}
                  className="cartao flex items-center justify-between gap-3 opacity-80"
                >
                  <div>
                    <p className="font-semibold">{f.nome}</p>
                    <p className="text-neutral-600">{f.funcao}</p>
                  </div>
                  <button
                    type="button"
                    className="botao-secundario"
                    onClick={() => mudarAtivo(f, true)}
                  >
                    Reativar
                  </button>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
