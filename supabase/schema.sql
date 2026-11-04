-- =====================================================================
-- Sistema de escala · estrutura do banco de dados (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em Run.
-- Pode rodar mais de uma vez sem problema.
-- =====================================================================

create extension if not exists "pgcrypto";

-- Funcionários do restaurante
create table if not exists funcionarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  funcao text not null,
  telefone text,
  cpf text unique,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Turnos de trabalho (ex.: Almoço, Jantar)
create table if not exists turnos (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  hora_inicio time not null,
  hora_fim time not null,
  ordem int not null default 0
);

-- Escala: quem trabalha em qual turno em qual dia
create table if not exists escalas (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  turno_id uuid not null references turnos (id) on delete cascade,
  funcionario_id uuid not null references funcionarios (id) on delete cascade,
  criado_em timestamptz not null default now(),
  unique (data, turno_id, funcionario_id)
);
create index if not exists escalas_data_idx on escalas (data);

-- Regras da casa: mínimo de pessoas por turno e função
-- dia_semana: 0 = domingo ... 6 = sábado; null = vale para todos os dias
create table if not exists regras (
  id uuid primary key default gen_random_uuid(),
  dia_semana smallint check (dia_semana between 0 and 6),
  turno_id uuid not null references turnos (id) on delete cascade,
  funcao text not null,
  minimo int not null default 1
);

-- Configurações gerais (chave e valor em texto)
create table if not exists configuracoes (
  chave text primary key,
  valor text not null
);

-- ---------------------------------------------------------------------
-- Acesso: liberado para a chave pública (anon). O app ainda não tem login.
-- Quando adicionar login, troque estas políticas por regras por usuário.
-- ---------------------------------------------------------------------
alter table funcionarios enable row level security;
alter table turnos enable row level security;
alter table escalas enable row level security;
alter table regras enable row level security;
alter table configuracoes enable row level security;

drop policy if exists "acesso aberto" on funcionarios;
drop policy if exists "acesso aberto" on turnos;
drop policy if exists "acesso aberto" on escalas;
drop policy if exists "acesso aberto" on regras;
drop policy if exists "acesso aberto" on configuracoes;

create policy "acesso aberto" on funcionarios for all using (true) with check (true);
create policy "acesso aberto" on turnos for all using (true) with check (true);
create policy "acesso aberto" on escalas for all using (true) with check (true);
create policy "acesso aberto" on regras for all using (true) with check (true);
create policy "acesso aberto" on configuracoes for all using (true) with check (true);

-- ---------------------------------------------------------------------
-- Dados de exemplo (restaurante fictício Vila Tempero)
-- Os CPFs são fictícios e batem com a API de ponto de demonstração.
-- ---------------------------------------------------------------------
insert into turnos (nome, hora_inicio, hora_fim, ordem) values
  ('Almoço', '11:00', '15:30', 1),
  ('Jantar', '18:00', '23:30', 2)
on conflict (nome) do nothing;

insert into funcionarios (nome, funcao, telefone, cpf) values
  ('Ana Souza',      'Salão',      '(11) 91234-0001', '12345678901'),
  ('Bruno Lima',     'Cozinha',    '(11) 91234-0002', '23456789012'),
  ('Carla Mendes',   'Caixa',      '(11) 91234-0003', '34567890123'),
  ('Diego Alves',    'Cozinha',    '(11) 91234-0004', '45678901234'),
  ('Elaine Costa',   'Salão',      '(11) 91234-0005', '56789012345'),
  ('Fábio Rocha',    'Bar',        '(11) 91234-0006', '67890123456'),
  ('Gabriela Nunes', 'Salão',      '(11) 91234-0007', '78901234567'),
  ('Henrique Dias',  'Entregador', '(11) 91234-0008', '89012345678')
on conflict (cpf) do nothing;

insert into configuracoes (chave, valor) values
  ('folgas_minimas_semana', '1'),
  ('bloquear_fechar_e_abrir', 'true'),
  ('tolerancia_atraso_minutos', '10'),
  ('hora_extra_minutos', '30')
on conflict (chave) do nothing;

-- Regras de exemplo: todos os dias, 2 no salão e 1 na cozinha por turno;
-- sexta e sábado à noite, 3 no salão e 2 na cozinha.
insert into regras (dia_semana, turno_id, funcao, minimo)
select null, t.id, 'Salão', 2 from turnos t
where not exists (select 1 from regras);
insert into regras (dia_semana, turno_id, funcao, minimo)
select null, t.id, 'Cozinha', 1 from turnos t
where (select count(*) from regras) = 2;
insert into regras (dia_semana, turno_id, funcao, minimo)
select d, t.id, 'Salão', 3 from turnos t, unnest(array[5, 6]) as d
where t.nome = 'Jantar' and (select count(*) from regras) = 4;
insert into regras (dia_semana, turno_id, funcao, minimo)
select d, t.id, 'Cozinha', 2 from turnos t, unnest(array[5, 6]) as d
where t.nome = 'Jantar' and (select count(*) from regras) = 6;
