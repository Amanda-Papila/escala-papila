# Sistema de escala de funcionários · template da aula

Ponto de partida para criar, com IA, um sistema de escala para o seu restaurante.
Você não precisa saber programar. Siga os passos na ordem; cada um tem uma checagem.

## O que vem pronto
- Site publicado na Vercel a cada mudança no GitHub
- Banco de dados no Supabase com as tabelas e dados de exemplo (`supabase/schema.sql`)
- Contexto para a IA em `CLAUDE.md`
- Os prompts da aula na pasta `prompts/`
- Documentação da API de ponto de demonstração em `docs/api-ponto.md`
- A ficha da solução em `docs/ficha-da-solucao.md`

## Passo 1 · Copiar este template para a sua conta (GitHub)
1. Clique no botão verde **Use this template** > **Create a new repository**.
2. Marque a caixa **Include all branches** (ela traz as versões prontas de cada entrega).
3. Nome: `escala-nomedoseurestaurante`. Escolha **Public** (não há segredo no código; as chaves ficam na Vercel). Clique em **Create repository**.
4. Convide a sua dupla: **Settings** > **Collaborators** > **Add people**, digite o usuário do GitHub dela. Ela aceita o convite pelo e-mail. Assim, se a sua cota acabar, a dupla continua no mesmo sistema.

Checagem: você vê o seu repositório, com estes mesmos arquivos dentro, e a dupla aparece em Collaborators.

## Passo 2 · Criar as tabelas (Supabase)
1. No seu projeto do Supabase, abra **SQL Editor** > **New query**.
2. Abra o arquivo `supabase/schema.sql` deste repositório, copie tudo e cole no editor.
3. Clique em **Run**.
4. Clique em **Connect** (botão no topo) e copie a **Project URL** (`https://xxxx.supabase.co`).
   Depois, em **Settings** > **API Keys**, copie a chave **Publishable** (começa com `sb_publishable_`).
   Se o seu projeto ainda mostrar a aba **Legacy** com a chave `anon public`, ela também funciona.

Checagem: aparece "Success". Em **Table Editor** existem as tabelas `funcionarios`,
`turnos`, `escalas`, `regras` e `configuracoes`, e `funcionarios` tem 8 linhas.

## Passo 3 · Publicar (Vercel)
1. Na Vercel, **Add New** > **Project** > **Import** no repositório do Passo 1.
2. Em **Environment Variables**, cole o bloco `.env.local` que o botão **Connect** do Supabase mostra
   (aba Framework, Next.js). São duas linhas:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o nome antigo `NEXT_PUBLIC_SUPABASE_ANON_KEY` também funciona)
3. Clique em **Create Project** (em algumas contas aparece **Deploy**) e aguarde 1 a 2 minutos.

Checagem: o link `escala-xxx.vercel.app` abre e mostra "Banco conectado. 8 funcionários e 2 turnos cadastrados".

Se aparecer "variáveis não configuradas": confira os nomes (sem espaços) e clique em **Redeploy**.
Se aparecer "tabelas não responderam": repita o Passo 2.
Se o seu repositório não aparecer na lista da Vercel: clique em **Adjust GitHub App Permissions**, marque o repositório e volte.
Se o projeto do Supabase aparecer como **Paused**: clique em **Restore project** e espere 1 a 2 minutos (projetos grátis pausam depois de 7 dias sem uso).

## Passo 4 · Conectar a IA (Claude Code na web)
1. Acesse **claude.ai/code** com a sua conta Claude Pro.
2. Conecte o GitHub. Quando o GitHub perguntar a quais repositórios o Claude tem acesso,
   escolha **All repositories** (ou marque o seu `escala-...`).
3. Selecione o repositório. Não envie nenhuma mensagem ainda.

Se o repositório não aparecer na lista: abra github.com/apps/claude, **Configure**, e inclua o repositório.

Checagem: o nome do seu repositório aparece no Claude Code.

## Passo 5 · Abrir no celular
Abra o link da Vercel no celular e use "Adicionar à tela inicial".

## Entrega 3 · variáveis da API de ponto
Na Vercel, em **Settings** > **Environment Variables**, adicione as quatro variáveis com os valores
fornecidos na aula (depois, os do seu fornecedor):

- `PONTO_API_URL` (endereço da API)
- `PONTO_CLIENT_ID` (qual restaurante)
- `PONTO_API_KEY` (qual aplicativo)
- `PONTO_API_SECRET` (a senha do aplicativo, só no servidor)

Se o deploy já tinha terminado quando você salvou, clique em **Redeploy**. Sem elas, a tela
Conferência do dia mostra dados de exemplo e avisa.

## Os prompts
Estão em `prompts/`, numerados na ordem da aula. Em cada um, o que está entre colchetes você
troca pelos dados do seu restaurante (use a ficha da solução). O resto fica igual.

## Rodar no seu computador (opcional)
```bash
npm install
cp .env.example .env.local   # preencha com os valores do Supabase
npm run dev
```

## Versões prontas (plano B)
As branches `entrega-1`, `entrega-2` e `entrega-3` têm cada etapa concluída. Se precisar pular
uma etapa, abra a branch no GitHub e faça merge na `main`; a Vercel publica sozinha.
