"use client";

import type { Escala, Funcionario } from "@/lib/tipos";

type Props = {
  atribuicoes: { escala: Escala; funcionario: Funcionario }[];
  disponiveis: Funcionario[];
  onAdicionar: (funcionarioId: string) => void;
  onRemover: (escalaId: string) => void;
  alertas?: string[];
};

/** Uma célula da grade: quem trabalha em um turno de um dia. */
export function CelulaEscala({ atribuicoes, disponiveis, onAdicionar, onRemover, alertas = [] }: Props) {
  const comAlerta = alertas.length > 0;
  return (
    <div
      className={`flex min-h-24 flex-col gap-1 rounded-xl border p-2 ${
        comAlerta ? "border-red-400 bg-red-50" : "border-neutral-200 bg-white"
      }`}
    >
      {atribuicoes.map(({ escala, funcionario }) => (
        <span
          key={escala.id}
          className="flex items-center justify-between gap-1 rounded-lg bg-neutral-100 px-2 py-1 text-sm"
        >
          <span className="truncate">
            {funcionario.nome.split(" ")[0]}
            <span className="text-neutral-500"> · {funcionario.funcao}</span>
          </span>
          <button
            aria-label={`Remover ${funcionario.nome}`}
            className="rounded px-1 text-neutral-500 hover:text-red-700"
            onClick={() => onRemover(escala.id)}
          >
            ×
          </button>
        </span>
      ))}
      {disponiveis.length > 0 && (
        <select
          className="mt-auto w-full rounded-lg border border-dashed border-neutral-300 bg-transparent px-2 py-1.5 text-sm text-neutral-600"
          value=""
          onChange={(e) => e.target.value && onAdicionar(e.target.value)}
        >
          <option value="">+ adicionar</option>
          {disponiveis.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome} · {f.funcao}
            </option>
          ))}
        </select>
      )}
      {alertas.map((a) => (
        <p key={a} className="text-xs font-medium text-red-700">
          {a}
        </p>
      ))}
    </div>
  );
}
