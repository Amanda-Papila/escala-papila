import { NextResponse, type NextRequest } from "next/server";
import { buscarMarcacoes } from "@/lib/integracoes/ponto";

// GET /api/conferencia?data=AAAA-MM-DD
// Busca as marcações de ponto do dia no servidor e devolve ao navegador,
// sem expor o token do fornecedor.
export async function GET(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");
  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ erro: "Informe a data no formato AAAA-MM-DD" }, { status: 400 });
  }
  const resultado = await buscarMarcacoes(data);
  return NextResponse.json(resultado, { headers: { "Cache-Control": "no-store" } });
}
