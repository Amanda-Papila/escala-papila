Me mostre o plano antes e espere minha aprovação.

Vou trocar a API de ponto de demonstração pela API real do meu fornecedor, que é o [Pontomais / Pontotel / outro]. A documentação está em [link ou arquivo docs/api-fornecedor.pdf que subi no projeto].

Adapte somente a camada que busca funcionários e marcações (o adaptador de ponto em src/lib/integracoes), para que a tela Conferência do dia continue funcionando igual. Os nomes dos campos do fornecedor são diferentes dos nossos; faça a tradução dentro do adaptador. Continue lendo as credenciais de variáveis de ambiente (PONTO_API_URL, PONTO_CLIENT_ID, PONTO_API_KEY, PONTO_API_SECRET; renomeie ou remova as que o fornecedor não usa). Se a API do fornecedor exigir outra forma de autenticação, como trocar client ID e secret por um token temporário, faça isso dentro do adaptador e me explique em linguagem simples o que preciso configurar.
