// Adaptador da API de ponto.
// Único arquivo que conhece o formato do fornecedor. Devolve sempre o formato interno
// (Marcacao). Para trocar de fornecedor, mude só este arquivo.
// Roda no servidor (Route Handler): o token nunca chega ao navegador.

import exemplo from "../../../docs/marcacoes-exemplo.json";

/** Formato interno de uma marcação de ponto. Horários "HH:MM" ou null. */
export type Marcacao = {
  cpf: string;
  data: string;
  entrada: string | null;
  saidaIntervalo: string | null;
  voltaIntervalo: string | null;
  saida: string | null;
};

export type ResultadoMarcacoes = {
  marcacoes: Marcacao[];
  /** "api" quando veio do fornecedor; "exemplo" quando usamos os dados de exemplo */
  fonte: "api" | "exemplo";
  aviso: string | null;
};

// Formato da API de demonstração (e o que precisa ser traduzido num fornecedor real)
type MarcacaoDoFornecedor = {
  cpf: string;
  data: string;
  entrada: string | null;
  saida_intervalo: string | null;
  volta_intervalo: string | null;
  saida: string | null;
};

function traduzir(m: MarcacaoDoFornecedor): Marcacao {
  return {
    cpf: String(m.cpf).replace(/\D/g, ""),
    data: m.data,
    entrada: m.entrada,
    saidaIntervalo: m.saida_intervalo,
    voltaIntervalo: m.volta_intervalo,
    saida: m.saida,
  };
}

/** Dados de exemplo do dia pedido (docs/marcacoes-exemplo.json cobre alguns dias). */
function exemploParaData(data: string): { marcacoes: Marcacao[]; aviso: string } {
  const todas = exemplo as MarcacaoDoFornecedor[];
  const doDia = todas.filter((m) => m.data === data);
  if (doDia.length === 0) {
    const datas = Array.from(new Set(todas.map((m) => m.data))).sort();
    return {
      marcacoes: [],
      aviso: ` Não há dados de exemplo para ${data}; eles cobrem ${datas.join(" e ")}.`,
    };
  }
  return { marcacoes: doDia.map(traduzir), aviso: "" };
}

export async function buscarMarcacoes(data: string): Promise<ResultadoMarcacoes> {
  const url = process.env.PONTO_API_URL;
  const clientId = process.env.PONTO_CLIENT_ID;
  const apiKey = process.env.PONTO_API_KEY;
  const apiSecret = process.env.PONTO_API_SECRET;

  const faltando = [
    !url && "PONTO_API_URL",
    !clientId && "PONTO_CLIENT_ID",
    !apiKey && "PONTO_API_KEY",
    !apiSecret && "PONTO_API_SECRET",
  ].filter(Boolean) as string[];

  if (faltando.length > 0 || !url || !clientId || !apiKey || !apiSecret) {
    const ex = exemploParaData(data);
    return {
      marcacoes: ex.marcacoes,
      fonte: "exemplo",
      aviso:
        `Variáveis não configuradas na Vercel: ${faltando.join(", ")}. Mostrando dados de exemplo.` +
        ex.aviso,
    };
  }

  try {
    // As três credenciais do fornecedor: conta (Client ID), aplicativo (API Key) e senha (Secret).
    const resposta = await fetch(`${url.replace(/\/$/, "")}/api/marcacoes?data=${data}`, {
      headers: {
        "X-Client-Id": clientId,
        "X-Api-Key": apiKey,
        Authorization: `Bearer ${apiSecret}`,
      },
      cache: "no-store",
    });
    if (!resposta.ok) {
      let detalhe = "";
      try {
        const corpo = (await resposta.json()) as { erro?: string };
        if (corpo && corpo.erro) detalhe = `: ${corpo.erro}`;
      } catch {
        // corpo não era JSON; segue só com o status
      }
      throw new Error(`API de ponto respondeu ${resposta.status}${detalhe}`);
    }
    const lista = (await resposta.json()) as MarcacaoDoFornecedor[];
    return { marcacoes: lista.map(traduzir), fonte: "api", aviso: null };
  } catch (e) {
    const ex = exemploParaData(data);
    return {
      marcacoes: ex.marcacoes,
      fonte: "exemplo",
      aviso: `Não foi possível falar com a API de ponto (${e instanceof Error ? e.message : String(e)}). Mostrando dados de exemplo.${ex.aviso}`,
    };
  }
}
