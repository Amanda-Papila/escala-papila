"use client";

import { useCallback, useEffect, useState } from "react";
import { conferir, type ResultadoConferencia, type Situacao } from "@/lib/conferencia";
import {
  listarConfiguracoes,
  listarEscalas,
  listarFuncionarios,
  listarTurnos,
  mensagemDeErro,
} from "@/lib/consultas";
import { hojeISO, rotuloDia, somarDias } from "@/lib/datas";
import type { ResultadoMarcacoes } from "@/lib/integracoes/ponto";
import { lerConfiguracoes } from "@/lib/regras";

const corDaSituacao: Record<Situacao, string> = {
  "No horário": "bg-green-100 text-green-800",
  Atrasado: "bg-amber-100 text-amber-800",
  Faltou: "bg-red-100 text-red-800",
  "Hora extra": "bg-blue-100 text-blue-800",
  "Sem CPF": "bg-neutral-200 text-neutral-700",
};

export default function ConferenciaDoDia() {
  const [data, setData] = useState(hojeISO());
  const [resultado, setResultado] = useState<ResultadoConferencia | null>(null);
  const [fonte, setFonte] = useState<ResultadoMarcacoes["fonte"] | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      // Marcações vêm do servidor (que fala com a API de ponto com o token)
      const resposta = await fetch(`/api/conferencia?data=${data}`);
      if (!resposta.ok) throw new Error(`Erro ${resposta.status} ao buscar marcações`);
      const marcacoes = (await resposta.json()) as ResultadoMarcacoes;

      // Escala e cadastro vêm do Supabase
      const [escalasDoDia, funcionarios, turnos, config] = await Promise.all([
        listarEscalas(data, data),
        listarFuncionarios(),
        listarTurnos(),
        listarConfiguracoes(),
      ]);

      setResultado(
        conferir({
          escalasDoDia,
          funcionarios,
          turnos,
          marcacoes: marcacoes.marcacoes,
          config: lerConfiguracoes(config),
        }),
      );
      setFonte(marcacoes.fonte);
      setAviso(marcacoes.aviso);
      setErro(null);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setCarregando(false);
    }
  }, [data]);

  useEffect(() => {
    // Recarrega sempre que a data muda.
    void (async () => {
      await carregar();
    })();
  }, [carregar]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Conferência do dia</h1>

      <div className="flex items-center gap-2">
        <button className="botao-secundario px-3" onClick={() => setData(somarDias(data, -1))} aria-label="Dia anterior">←</button>
        <input type="date" className="campo flex-1 text-center" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
        <button className="botao-secundario px-3" onClick={() => setData(somarDias(data, 1))} aria-label="Próximo dia">→</button>
      </div>
      <p className="text-center text-sm text-neutral-600">{rotuloDia(data)}</p>

      {aviso && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{aviso}</p>}
      {erro && <p className="rounded-xl bg-red-50 p-3 text-red-700">{erro}</p>}
      {carregando && <p className="text-neutral-600">Buscando marcações...</p>}

      {resultado && !carregando && (
        <>
          <section className="grid grid-cols-4 gap-2 text-center">
            <Resumo rotulo="No horário" valor={resultado.resumo.noHorario} classe={corDaSituacao["No horário"]} />
            <Resumo rotulo="Atrasos" valor={resultado.resumo.atrasos} classe={corDaSituacao.Atrasado} />
            <Resumo rotulo="Faltas" valor={resultado.resumo.faltas} classe={corDaSituacao.Faltou} />
            <Resumo rotulo="Horas extras" valor={resultado.resumo.horasExtras} classe={corDaSituacao["Hora extra"]} />
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Escalados no dia</h2>
            {resultado.linhas.length === 0 && (
              <p className="cartao text-neutral-700">Ninguém escalado para este dia. Monte a escala na tela Escala.</p>
            )}
            {resultado.linhas.map((l) => (
              <article key={l.funcionario.id} className="cartao">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{l.funcionario.nome}</p>
                    <p className="text-sm text-neutral-600">
                      {l.turnos} · planejado {l.planejadoInicio} às {l.planejadoFim}
                    </p>
                    {!l.funcionario.cpf && (
                      <p className="text-xs text-amber-700">Sem CPF no cadastro: não dá para cruzar com o ponto.</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {l.situacoes.map((s) => (
                      <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${corDaSituacao[s]}`}>
                        {s}
                        {s === "Atrasado" ? ` ${l.minutosAtraso} min` : ""}
                        {s === "Hora extra" ? ` ${l.minutosExtra} min` : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-sm">
                  Real: entrada <strong>{l.entradaReal ?? "sem registro"}</strong>, saída{" "}
                  <strong>{l.saidaReal ?? "sem registro"}</strong>
                </p>
              </article>
            ))}
          </section>

          {resultado.naoEscalados.length > 0 && (
            <section className="space-y-2">
              <h2 className="font-semibold">Bateram ponto sem estar na escala</h2>
              {resultado.naoEscalados.map((n) => (
                <article key={n.cpf} className="cartao flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{n.funcionario?.nome ?? `CPF ${n.cpf} (não cadastrado)`}</p>
                    <p className="text-sm text-neutral-600">
                      entrada {n.entrada ?? "?"}, saída {n.saida ?? "?"}
                    </p>
                  </div>
                  <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-800">Não escalado</span>
                </article>
              ))}
            </section>
          )}

          <p className="text-center text-xs text-neutral-500">
            Fonte das marcações: {fonte === "api" ? "API de ponto" : "dados de exemplo"}
          </p>
        </>
      )}
    </div>
  );
}

function Resumo({ rotulo, valor, classe }: { rotulo: string; valor: number; classe: string }) {
  return (
    <div className={`rounded-xl p-2 ${classe}`}>
      <p className="text-2xl font-bold">{valor}</p>
      <p className="text-xs font-medium">{rotulo}</p>
    </div>
  );
}
