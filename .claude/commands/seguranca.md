---
description: Revisão de segurança do sistema, em linguagem simples, sem mudar nada sozinho
---

Faça uma revisão de segurança deste projeto e me responda em português simples, sem termos técnicos, em no máximo 20 linhas. Não altere nenhum arquivo nesta etapa: só olhe e me diga.

Confira, nesta ordem:

1. Chaves e senhas: existe alguma chave, token ou senha escrita direto no código ou em arquivo do repositório? Tudo precisa vir de variável de ambiente.
2. Chamadas a APIs com token (ponto, Anthropic ou outras) acontecem só no servidor (src/app/api), nunca no navegador?
3. Variáveis com NEXT_PUBLIC_: nenhuma delas guarda algo secreto? (A chave Publishable do Supabase pode; a Secret nunca.)
4. Banco de dados (supabase/schema.sql): quem consegue ler e alterar cada tabela hoje? Diga em uma frase o risco de o link estar aberto.
5. Dados pessoais: CPF, telefone ou outro dado sensível aparece na tela para qualquer pessoa com o link?
6. Formulários: algum campo aceita qualquer coisa sem conferir (tamanho, formato)?

Termine com uma lista curta, em ordem de prioridade, do que eu deveria corrigir primeiro. Para cada item, escreva o pedido exato que eu posso colar aqui depois para você corrigir, um por vez, sempre com plano antes.
