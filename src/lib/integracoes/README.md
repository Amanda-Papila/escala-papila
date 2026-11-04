# Integrações externas

Cada serviço externo (API de ponto, iFood, ERP) tem um arquivo aqui, e só aqui.
O arquivo recebe a configuração por variáveis de ambiente e devolve dados no
formato interno do sistema (veja `src/lib/tipos.ts`). Assim, trocar de fornecedor
mexe em um arquivo só.
