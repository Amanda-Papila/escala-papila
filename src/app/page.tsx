"use client";

import { useEffect, useState } from "react";
import { supabase, variaveisConfiguradas } from "@/lib/supabase";

type Estado =
  | { tipo: "carregando" }
  | { tipo: "sem-variaveis" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "ok"; funcionarios: number; turnos: number };

export default function Inicio() {
  const [estado, setEstado] = useState<Estado>({ tipo: "carregando" });

  useEffect(() => {
    async function verificar() {
      if (!variaveisConfiguradas()) {
        setEstado({ tipo: "sem-variaveis" });
        return;
      }
      try {
        const db = supabase();
        const [f, t] = await Promise.all([
          db.from("funcionarios").select("id", { count: "exact", head: true }),
          db.from("turnos").select("id", { count: "exact", head: true }),
        ]);
        if (f.error) throw f.error;
        if (t.error) throw t.error;
        setEstado({ tipo: "ok", funcionarios: f.count ?? 0, turnos: t.count ?? 0 });
      } catch (e) {
        setEstado({ tipo: "erro", mensagem: e instanceof Error ? e.message : String(e) });
      }
    }
    verificar();
  }, []);

  return (
    <div className="space-y-5">
      <section className="cartao">
        <h1 className="text-2xl font-bold">Sistema de escala, pronto para construir</h1>
        <p className="mt-2 text-neutral-700">
          Este é o ponto de partida. A estrutura, o banco de dados e a publicação já
          estão configurados. As telas da escala serão criadas por você, com a IA,
          durante a aula.
        </p>
      </section>

      <section className="cartao">
        <h2 className="text-lg font-semibold">Conexão com o banco de dados</h2>
        {estado.tipo === "carregando" && <p className="mt-2 text-neutral-600">Verificando...</p>}
        {estado.tipo === "sem-variaveis" && (
          <p className="mt-2 text-red-700">
            As variáveis do Supabase não foram configuradas. Na Vercel, em Settings &gt;
            Environment Variables, adicione NEXT_PUBLIC_SUPABASE_URL e
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou ANON_KEY) e faça Redeploy.
          </p>
        )}
        {estado.tipo === "erro" && (
          <p className="mt-2 text-red-700">
            Banco conectado, mas as tabelas não responderam. Rode o arquivo
            supabase/schema.sql no SQL Editor do Supabase. Detalhe: {estado.mensagem}
          </p>
        )}
        {estado.tipo === "ok" && (
          <p className="mt-2 text-green-700">
            Banco conectado. {estado.funcionarios} funcionários e {estado.turnos} turnos
            cadastrados. Tudo pronto para a Entrega 1.
          </p>
        )}
      </section>
    </div>
  );
}
