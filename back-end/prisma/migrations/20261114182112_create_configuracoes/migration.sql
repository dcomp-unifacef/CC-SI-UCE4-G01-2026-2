-- CreateTable
CREATE TABLE "Configuracao" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "sessao_inatividade_min" INTEGER NOT NULL DEFAULT 30,
    "sessao_duracao_max_min" INTEGER NOT NULL DEFAULT 480,
    "consulta_duracao_max_min" INTEGER NOT NULL DEFAULT 240,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,
    "atualizado_por_id" INTEGER,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id"),
    -- Acréscimo manual: linha única
    CONSTRAINT "Configuracao_linha_unica" CHECK ("id" = 1),
    -- Acréscimo manual: valores maiores que zero e inatividade não maior que a duração absoluta
    CONSTRAINT "Configuracao_valores_validos" CHECK (
        "sessao_inatividade_min" > 0
        AND "sessao_duracao_max_min" > 0
        AND "consulta_duracao_max_min" > 0
        AND "sessao_inatividade_min" <= "sessao_duracao_max_min"
    )
);

-- AddForeignKey
ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_atualizado_por_id_fkey" FOREIGN KEY ("atualizado_por_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Acréscimo manual: linha inicial com os valores padrão (30, 480 e 240 minutos)
INSERT INTO "Configuracao" ("id", "atualizado_em") VALUES (1, CURRENT_TIMESTAMP);
