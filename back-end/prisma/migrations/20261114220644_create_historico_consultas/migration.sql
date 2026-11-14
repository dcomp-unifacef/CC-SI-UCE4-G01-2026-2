-- CreateEnum
CREATE TYPE "TipoHistoricoConsulta" AS ENUM ('CRIACAO', 'MUDANCA_DE_STATUS', 'REAGENDAMENTO');

-- CreateTable
CREATE TABLE "HistoricoConsulta" (
    "id" SERIAL NOT NULL,
    "consulta_id" INTEGER NOT NULL,
    "tipo" "TipoHistoricoConsulta" NOT NULL,
    "status_anterior" "StatusConsulta",
    "status_novo" "StatusConsulta" NOT NULL,
    "inicio_anterior" TIMESTAMPTZ(3),
    "inicio_novo" TIMESTAMPTZ(3),
    "duracao_anterior_min" INTEGER,
    "duracao_nova_min" INTEGER,
    "motivo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoConsulta_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HistoricoConsulta_coerencia_do_tipo" CHECK (
        (
            "tipo" = 'CRIACAO'
            AND "status_anterior" IS NULL
            AND "inicio_anterior" IS NULL
            AND "duracao_anterior_min" IS NULL
            AND "inicio_novo" IS NOT NULL
            AND "duracao_nova_min" IS NOT NULL
        )
        OR (
            "tipo" = 'MUDANCA_DE_STATUS'
            AND "status_anterior" IS NOT NULL
            AND "status_anterior" <> "status_novo"
            AND "inicio_anterior" IS NULL
            AND "inicio_novo" IS NULL
            AND "duracao_anterior_min" IS NULL
            AND "duracao_nova_min" IS NULL
        )
        OR (
            "tipo" = 'REAGENDAMENTO'
            AND "status_anterior" IS NULL
            AND "inicio_anterior" IS NOT NULL
            AND "inicio_novo" IS NOT NULL
            AND "duracao_anterior_min" IS NOT NULL
            AND "duracao_nova_min" IS NOT NULL
            AND ("inicio_anterior" <> "inicio_novo" OR "duracao_anterior_min" <> "duracao_nova_min")
        )
    ),
    CONSTRAINT "HistoricoConsulta_duracoes_positivas" CHECK (
        ("duracao_anterior_min" IS NULL OR "duracao_anterior_min" > 0)
        AND ("duracao_nova_min" IS NULL OR "duracao_nova_min" > 0)
    ),
    CONSTRAINT "HistoricoConsulta_motivo_nao_vazio" CHECK ("motivo" IS NULL OR btrim("motivo") <> '')
);

-- CreateIndex
CREATE INDEX "HistoricoConsulta_consulta_id_idx" ON "HistoricoConsulta"("consulta_id");

-- AddForeignKey
ALTER TABLE "HistoricoConsulta" ADD CONSTRAINT "HistoricoConsulta_consulta_id_fkey" FOREIGN KEY ("consulta_id") REFERENCES "Consulta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoConsulta" ADD CONSTRAINT "HistoricoConsulta_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
