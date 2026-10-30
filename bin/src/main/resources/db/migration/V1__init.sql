CREATE TABLE tipo_aula (
    id         BIGSERIAL PRIMARY KEY,
    nome       VARCHAR(100) NOT NULL UNIQUE,
    descricao  TEXT,
    ativo      BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE aluno (
    id          BIGSERIAL PRIMARY KEY,
    nome        VARCHAR(150) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    telefone    VARCHAR(30)  NOT NULL,
    idade       INTEGER CHECK (idade > 0 AND idade < 120),
    tipo_plano  VARCHAR(20)  NOT NULL CHECK (tipo_plano IN ('PARTICULAR', 'TOTALPASS', 'WELLHUB')),
    senha_hash  VARCHAR(100) NOT NULL,
    role        VARCHAR(20)  NOT NULL DEFAULT 'ALUNO' CHECK (role IN ('ALUNO', 'ADMIN')),
    ativo       BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE aula (
    id                BIGSERIAL PRIMARY KEY,
    tipo_aula_id      BIGINT NOT NULL REFERENCES tipo_aula (id),
    data_hora_inicio  TIMESTAMPTZ NOT NULL,
    duracao_min       INTEGER NOT NULL CHECK (duracao_min > 0),
    capacidade        INTEGER NOT NULL CHECK (capacidade > 0),
    status            VARCHAR(20) NOT NULL DEFAULT 'ATIVA' CHECK (status IN ('ATIVA', 'CANCELADA')),
    version           BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX idx_aula_data ON aula (data_hora_inicio);

CREATE TABLE reserva (
    id         BIGSERIAL PRIMARY KEY,
    aula_id    BIGINT NOT NULL REFERENCES aula (id),
    aluno_id   BIGINT NOT NULL REFERENCES aluno (id),
    status     VARCHAR(20) NOT NULL CHECK (status IN ('CONFIRMADA', 'CANCELADA', 'LISTA_ESPERA')),
    criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_reserva_aula_aluno UNIQUE (aula_id, aluno_id)
);
CREATE INDEX idx_reserva_aluno ON reserva (aluno_id);

INSERT INTO tipo_aula (nome, descricao) VALUES
    ('Hatha Yoga', 'Aula tradicional com foco em posturas e respiração'),
    ('Hot Yoga', 'Aula em sala aquecida'),
    ('Candlelight', 'Aula à luz de velas, ritmo mais suave');
