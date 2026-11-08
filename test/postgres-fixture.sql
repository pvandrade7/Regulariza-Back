-- Estrutura mínima correspondente ao contract.prisma, somente no cluster criado pelo teste.
CREATE TABLE usuario (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome varchar(150) NOT NULL, email varchar(255) NOT NULL UNIQUE);
CREATE TABLE regime_juridico (id serial PRIMARY KEY, nome varchar(100) NOT NULL UNIQUE);
CREATE TABLE empresa (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), usuario_id uuid NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
 regime_juridico_id integer NOT NULL REFERENCES regime_juridico(id), nome varchar(150) NOT NULL,
 cpf varchar(11) UNIQUE, cnpj varchar(14) UNIQUE, atividade varchar(150) NOT NULL, porte varchar(50),
 municipio varchar(100) NOT NULL, estado varchar(2) NOT NULL, numero_funcionarios integer NOT NULL DEFAULT 0 CHECK(numero_funcionarios>=0),
 estabelecimento_fisico boolean NOT NULL DEFAULT false
);
CREATE TABLE obrigacoes (id serial PRIMARY KEY, nome varchar(150) NOT NULL, descricao text, categoria varchar(100) NOT NULL, periodicidade varchar(50), prazo varchar(100), orgao_relacionado varchar(150));
CREATE TABLE criterios (id serial PRIMARY KEY, obrigacao_id integer NOT NULL REFERENCES obrigacoes(id) ON DELETE CASCADE, campo varchar(100) NOT NULL, operador varchar(20) NOT NULL, valor varchar(150) NOT NULL);
CREATE TABLE empresa_obrigacoes (id serial PRIMARY KEY, empresa_id uuid NOT NULL REFERENCES empresa(id) ON DELETE CASCADE, obrigacoes_id integer NOT NULL REFERENCES obrigacoes(id) ON DELETE CASCADE, status varchar(30) NOT NULL DEFAULT 'Pendente', vencimento date, UNIQUE(empresa_id,obrigacoes_id));
INSERT INTO regime_juridico (nome) VALUES ('Pessoa Física'),('Pessoa Jurídica');
INSERT INTO obrigacoes (nome,categoria,periodicidade) VALUES ('Obrigação de teste','Teste','mensal');
INSERT INTO criterios (obrigacao_id,campo,operador,valor) VALUES (1,'estado','=','CE');
