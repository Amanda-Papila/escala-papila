---
description: Entrevista inicial com o dono do restaurante e construção da primeira versão (Equipe e Escala da semana)
---
Você está começando este projeto com um dono de restaurante sem formação técnica. Leia o CLAUDE.md antes de tudo.

## Passo 1: uma única mensagem com todas as perguntas
Cumprimente em uma frase e faça TODAS as perguntas abaixo numa única mensagem, numeradas, pedindo que ele responda tudo de uma vez (as respostas estão na ficha da solução que ele preencheu à mão). Não faça perguntas extras.

1. Nome do restaurante e tipo (ex.: pizzaria, a la carte, hamburgueria).
2. Dias e horários de funcionamento.
3. Turnos que existem, com nome e horário (ex.: Almoço 11h às 15h30; Jantar 18h às 23h30).
4. Funções da equipe (ex.: cozinha, salão, caixa, bar, entregador).
5. Mínimo de pessoas por turno e função em dias normais, e em dias de pico (quais dias).
6. Folgas por semana de cada funcionário, e se alguém pode fechar um dia e abrir o dia seguinte.
7. Cor principal e cor secundária do restaurante (nome da cor ou código), ou "deixa o padrão".
8. Já subiu o logo em public/logo.png? (sim ou não)
9. Alguma regra da casa que não cabe acima? (ex.: "o João nunca fecha porque pega o último ônibus")

## Passo 2: registrar as respostas
Depois que ele responder, crie `src/config/restaurante.ts` exportando um objeto `RESTAURANTE` com: nome, tipo, funcionamento (texto), turnos (lista com nome, horaInicio, horaFim), funcoes (lista), minimos (texto por extenso, do jeito que ele disse), folgasPorSemana (número), podeFecharEAbrir (boolean), regrasExtras (lista de textos), corPrincipal, corSecundaria, temLogo. Use exatamente o que ele disse; não invente regras. Atualize `src/config/identidade.ts` com nome e cores.

Se os turnos dele forem diferentes de Almoço e Jantar, gere o SQL de `insert ... on conflict (nome) do update` para a tabela `turnos` e peça para ele colar no SQL Editor do Supabase (regra 4 do CLAUDE.md: não altere o schema por conta própria). Os turnos de exemplo podem continuar lá.

## Passo 3: plano e aprovação
Mostre um plano curto (no máximo 6 linhas) da Entrega 1: tela Equipe (lista, adicionar, editar, desativar) e tela Escala da semana (dias nas colunas, turnos nas linhas, escolher quem trabalha em cada célula, avançar e voltar semana), tudo salvo no Supabase e funcionando bem no celular. Pergunte "Posso fazer?" e espere a resposta. Só construa depois de um "pode fazer" (ou equivalente).

## Passo 4: construir a Entrega 1
Construa só isso. Não adicione login, alertas de regras nem conferência de ponto: são as próximas entregas, e elas vão ler `src/config/restaurante.ts`. Rode `npm run build`. Faça commit e push direto para a branch `main`, sem pull request (regra 10). Termine dizendo, em duas linhas, o que ele deve testar no celular.
