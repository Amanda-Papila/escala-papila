// Leituras e gravações no Supabase, em um lugar só.
// As telas chamam estas funções; nenhuma tela fala com o banco diretamente.

import { supabase } from "./supabase";
import type { Escala, Funcionario, Turno } from "./tipos";

// ---------- Funcionários ----------

export async function listarFuncionarios(): Promise<Funcionario[]> {
  const { data, error } = await supabase()
    .from("funcionarios")
    .select("*")
    .order("ativo", { ascending: false })
    .order("nome");
  if (error) throw error;
  return data as Funcionario[];
}

export type DadosFuncionario = {
  nome: string;
  funcao: string;
  telefone: string | null;
  cpf: string | null;
};

export async function criarFuncionario(dados: DadosFuncionario): Promise<void> {
  const { error } = await supabase().from("funcionarios").insert(dados);
  if (error) throw error;
}

export async function atualizarFuncionario(id: string, dados: Partial<DadosFuncionario> & { ativo?: boolean }): Promise<void> {
  const { error } = await supabase().from("funcionarios").update(dados).eq("id", id);
  if (error) throw error;
}

// ---------- Turnos ----------

export async function listarTurnos(): Promise<Turno[]> {
  const { data, error } = await supabase().from("turnos").select("*").order("ordem");
  if (error) throw error;
  return data as Turno[];
}

// ---------- Escalas ----------

export async function listarEscalas(dataInicio: string, dataFim: string): Promise<Escala[]> {
  const { data, error } = await supabase()
    .from("escalas")
    .select("*")
    .gte("data", dataInicio)
    .lte("data", dataFim);
  if (error) throw error;
  return data as Escala[];
}

export async function adicionarNaEscala(data: string, turnoId: string, funcionarioId: string): Promise<void> {
  const { error } = await supabase()
    .from("escalas")
    .insert({ data, turno_id: turnoId, funcionario_id: funcionarioId });
  if (error && error.code !== "23505") throw error; // 23505 = já estava na escala
}

export async function removerDaEscala(id: string): Promise<void> {
  const { error } = await supabase().from("escalas").delete().eq("id", id);
  if (error) throw error;
}

/** Transforma um erro qualquer em texto legível. */
export function mensagemDeErro(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return String(e);
}
