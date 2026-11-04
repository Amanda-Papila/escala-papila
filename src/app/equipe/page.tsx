"use client";

import { useEffect, useState } from "react";
import {
  atualizarFuncionario,
  criarFuncionario,
  listarFuncionarios,
  mensagemDeErro,
  type DadosFuncionario,
} from "@/lib/consultas";
import { FUNCOES_PADRAO, type Funcionario } from "@/lib/tipos";

const formularioVazio: DadosFuncionario = { nome: "", funcao: FUNCOES_PADRAO[0], telefone: "", cpf: "" };

export default function Equipe() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | "novo" | null>(null);
  const [form, setForm] = useState<DadosFuncionario>(formularioVazio);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    try {
      setFuncionarios(await listarFuncionarios());
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    // Carrega a lista ao abrir a tela.
    void (async () => {
      await carregar();
    })();
  }, []);

  function abrirNovo() {
    setForm(formularioVazio);
    setEditando("novo");
  }

  function abrirEdicao(f: Funcionario) {
    setForm({ nome: f.nome, funcao: f.funcao, telefone: f.telefone ?? "", cpf: f.cpf ?? "" });
    setEditando(f.id);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim()) return;
    setSalvando(true);
    const dados: DadosFuncionario = {
      nome: form.nome.trim(),
      funcao: form.funcao.trim(),
      telefone: form.telefone?.trim() || null,
      cpf: form.cpf?.replace(/\D/g, "") || null,
    };
    try {
      if (editando === "novo") await criarFuncionario(dados);
      else if (editando) await atualizarFuncionario(editando, dados);
      setEditando(null);
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    } finally {
      setSalvando(false);
    }
  }

  async function alternarAtivo(f: Funcionario) {
    try {
      await atualizarFuncionario(f.id, { ativo: !f.ativo });
      await carregar();
    } catch (err) {
      setErro(mensagemDeErro(err));
    }
  }

  const ativos = funcionarios.filter((f) => f.ativo);
  const inativos = funcionarios.filter((f) => !f.ativo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Equipe</h1>
        <button className="botao" onClick={abrirNovo}>+ Adicionar</button>
      </div>

      {erro && <p className="rounded-xl bg-red-50 p-3 text-red-700">{erro}</p>}

      {editando && (
        <form onSubmit={salvar} className="cartao space-y-3">
          <h2 className="font-semibold">{editando === "novo" ? "Novo funcionário" : "Editar funcionário"}</h2>
          <label className="block text-sm font-medium">
            Nome
            <input className="campo mt-1" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required autoFocus />
          </label>
          <label className="block text-sm font-medium">
            Função
            <input className="campo mt-1" list="funcoes" value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} required />
            <datalist id="funcoes">
              {FUNCOES_PADRAO.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm font-medium">
            Telefone
            <input className="campo mt-1" inputMode="tel" value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 9xxxx-xxxx" />
          </label>
          <label className="block text-sm font-medium">
            CPF (só números, opcional)
            <input className="campo mt-1" inputMode="numeric" value={form.cpf ?? ""} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="00000000000" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="botao flex-1" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</button>
            <button type="button" className="botao-secundario flex-1" onClick={() => setEditando(null)}>Cancelar</button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="text-neutral-600">Carregando...</p>
      ) : (
        <>
          <ul className="space-y-2">
            {ativos.map((f) => (
              <li key={f.id} className="cartao flex items-center justify-between gap-3">
                <button className="min-w-0 flex-1 text-left" onClick={() => abrirEdicao(f)}>
                  <p className="truncate font-semibold">{f.nome}</p>
                  <p className="text-sm text-neutral-600">
                    {f.funcao}
                    {f.telefone ? ` · ${f.telefone}` : ""}
                  </p>
                </button>
                <button className="botao-secundario px-3 py-2 text-sm" onClick={() => alternarAtivo(f)}>Desativar</button>
              </li>
            ))}
            {ativos.length === 0 && <li className="text-neutral-600">Nenhum funcionário ativo. Toque em Adicionar.</li>}
          </ul>

          {inativos.length > 0 && (
            <details className="cartao">
              <summary className="cursor-pointer font-semibold text-neutral-700">Desativados ({inativos.length})</summary>
              <ul className="mt-3 space-y-2">
                {inativos.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-3 text-neutral-600">
                    <span>{f.nome} · {f.funcao}</span>
                    <button className="botao-secundario px-3 py-2 text-sm" onClick={() => alternarAtivo(f)}>Reativar</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
