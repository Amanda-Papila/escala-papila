# Sistema de escala de funcionários · contexto do projeto

Este projeto é um sistema de escala para um restaurante, criado por um dono de restaurante
sem formação técnica, com ajuda da IA. Leia este arquivo antes de qualquer tarefa.

## O que já existe
- Next.js (App Router, TypeScript, Tailwind) publicado na Vercel a cada push na branch `main`.
- Banco de dados Supabase (Postgres) com as tabelas em `supabase/schema.sql`:
  `funcionarios`, `turnos`, `escalas`, `regras`, `configuracoes`. Já há dados de exemplo.
- Cliente do Supabase em `src/lib/supabase.ts` (usa `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ou o nome antigo `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- Tipos das tabelas em `src/lib/tipos.ts`; funções de data em `src/lib/datas.ts`.
- Identidade visual (nome, cores, logo) em `src/config/identidade.ts`; menu em `src/config/menu.ts`.
- Layout com cabeçalho e menu em `src/app/layout.tsx` e `src/components/Cabecalho.tsx`.
- Classes CSS prontas em `src/app/globals.css`: `.botao`, `.botao-secundario`, `.campo`, `.cartao`.
- Documentação da API de ponto em `docs/api-ponto.md` e dados de exemplo em `docs/marcacoes-exemplo.json`.

## Regras para qualquer mudança
1. Antes de alterar código, apresente um plano curto e espere a aprovação.
2. Tudo em português do Brasil: textos de tela, nomes de variáveis novas, comentários, commits.
3. Mobile first: a tela é usada principalmente no celular. Botões grandes, texto legível,
   nada que dependa de passar o mouse. Use as classes `.botao`, `.campo` e `.cartao`.
4. Não altere `supabase/schema.sql` nem crie tabelas novas sem avisar explicitamente no plano.
   Se precisar de uma coluna nova, explique antes e gere o SQL para o usuário rodar.
5. Não instale dependências novas sem necessidade real. Prefira o que já está no projeto.
6. Nunca escreva chaves, tokens ou senhas no código. Tudo vem de variáveis de ambiente.
   Chamadas a APIs externas com token acontecem no servidor (Route Handlers em `src/app/api`),
   nunca no navegador.
7. Toda integração externa fica em `src/lib/integracoes/`, um arquivo por serviço, devolvendo
   sempre o formato interno do sistema (veja `src/lib/tipos.ts`). Trocar de fornecedor deve
   mexer só nesse arquivo.
8. Cada tela nova entra no menu (`src/config/menu.ts`) e funciona sem login (o login é um passo futuro).
9. Mantenha o que já funciona. Mudanças pequenas e verificáveis; rode `npm run build` antes do commit.
10. Ao terminar, faça commit com mensagem curta em português e push direto para a branch `main`
    (`git push origin HEAD:main`). Não abra pull request: a Vercel publica o que está na `main`.
11. A API de ponto externa (`PONTO_API_URL`, com `PONTO_CLIENT_ID`, `PONTO_API_KEY` e `PONTO_API_SECRET`) só responde a partir do site publicado na Vercel.
    Não tente chamá-la daqui: a rede deste ambiente não alcança a internet em geral e a falha
    não significa erro no código. Confie em `docs/api-ponto.md` e em `docs/marcacoes-exemplo.json`.

## Como o dono descreve o restaurante
Há dois caminhos, e os dois terminam no mesmo lugar:
- `/comecar` (comando em `.claude/commands/comecar.md`): você entrevista o dono numa única mensagem,
  registra as respostas em `src/config/restaurante.ts` e constrói a Entrega 1 depois do "pode fazer".
- Prompts prontos (pasta `prompts/`): as respostas às quatro perguntas (entrada, regras, saída, quem usa)
  chegam no pedido, entre colchetes.
Se `src/config/restaurante.ts` existir, leia-o antes de qualquer tarefa: ele vale mais que qualquer padrão.
Respeite as regras da casa descritas ali ou no pedido.
