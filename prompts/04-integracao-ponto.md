Me mostre o plano antes e espere minha aprovação.

Crie uma tela "Conferência do dia" que compara a escala planejada com as marcações reais de ponto.

As marcações vêm de uma API externa. A documentação está no arquivo docs/api-ponto.md do projeto. A URL base e as três credenciais (Client ID, API Key e API Secret) devem ficar em variáveis de ambiente (PONTO_API_URL, PONTO_CLIENT_ID, PONTO_API_KEY e PONTO_API_SECRET), nunca no código. Faça a chamada pelo lado do servidor, para o secret não aparecer no navegador.

Na tela:
1. Seletor de data (padrão: hoje).
2. Para cada funcionário escalado no dia: horário planejado, horário real de entrada e saída, e uma situação: No horário (até 10 min de tolerância), Atrasado (com os minutos), Faltou (sem marcação), Hora extra (saiu mais de 30 min depois do planejado).
3. Quem bateu ponto mas não estava na escala aparece numa lista separada "Não escalados".
4. Resumo no topo: total de atrasos, faltas e horas extras do dia.
5. No rodapé da tela, a fonte dos dados: "API de ponto" quando vieram da API, ou "dados de exemplo" quando a API não respondeu e você usou docs/marcacoes-exemplo.json.

Para ligar o funcionário da API ao funcionário do meu sistema, use o campo CPF (adicione o campo CPF no cadastro se não existir).
Se a API falhar, mostre uma mensagem clara em vez de quebrar a tela. Ao terminar, commit e push direto na branch main, sem pull request.
