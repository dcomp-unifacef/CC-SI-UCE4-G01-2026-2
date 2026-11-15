-- CreateEnum
CREATE TYPE "SituacaoRetorno" AS ENUM ('ABERTO', 'ATENDIDO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "TipoHistoricoRetorno" AS ENUM ('CRIACAO', 'CORRECAO_DE_DATA', 'DESCARTE', 'ATENDIMENTO');

-- CreateTable
CREATE TABLE "Retorno" (
    "id" SERIAL NOT NULL,
    "paciente_id" INTEGER NOT NULL,
    "visita_origem_id" INTEGER NOT NULL,
    "data_prevista" DATE NOT NULL,
    "situacao" "SituacaoRetorno" NOT NULL DEFAULT 'ABERTO',
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerrado_em" TIMESTAMPTZ(3),
    "encerrado_por_id" INTEGER,
    "motivo_descarte" TEXT,

    CONSTRAINT "Retorno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoRetorno" (
    "id" SERIAL NOT NULL,
    "retorno_id" INTEGER NOT NULL,
    "tipo" "TipoHistoricoRetorno" NOT NULL,
    "data_anterior" DATE,
    "data_nova" DATE,
    "situacao_anterior" "SituacaoRetorno",
    "situacao_nova" "SituacaoRetorno" NOT NULL,
    "motivo" TEXT,
    "usuario_id" INTEGER NOT NULL,
    "registrado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoRetorno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Retorno_paciente_id_idx" ON "Retorno"("paciente_id");

-- CreateIndex
CREATE INDEX "Retorno_situacao_data_prevista_idx" ON "Retorno"("situacao", "data_prevista");

-- CreateIndex
CREATE INDEX "HistoricoRetorno_retorno_id_idx" ON "HistoricoRetorno"("retorno_id");

-- AddForeignKey
ALTER TABLE "Retorno" ADD CONSTRAINT "Retorno_paciente_id_fkey" FOREIGN KEY ("paciente_id") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retorno" ADD CONSTRAINT "Retorno_visita_origem_id_fkey" FOREIGN KEY ("visita_origem_id") REFERENCES "HistoricoVisita"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Retorno" ADD CONSTRAINT "Retorno_encerrado_por_id_fkey" FOREIGN KEY ("encerrado_por_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoRetorno" ADD CONSTRAINT "HistoricoRetorno_retorno_id_fkey" FOREIGN KEY ("retorno_id") REFERENCES "Retorno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoRetorno" ADD CONSTRAINT "HistoricoRetorno_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Retorno" ADD CONSTRAINT "Retorno_encerramento_coerente" CHECK (
  (
    "situacao" = 'ABERTO'
    AND "encerrado_em" IS NULL
    AND "encerrado_por_id" IS NULL
    AND "motivo_descarte" IS NULL
  )
  OR (
    "situacao" = 'ATENDIDO'
    AND "encerrado_em" IS NOT NULL
    AND "motivo_descarte" IS NULL
  )
  OR (
    "situacao" = 'DESCARTADO'
    AND "encerrado_em" IS NOT NULL
    AND "encerrado_por_id" IS NOT NULL
    AND "motivo_descarte" IS NOT NULL
    AND length(btrim("motivo_descarte")) > 0
  )
);

ALTER TABLE "HistoricoRetorno" ADD CONSTRAINT "HistoricoRetorno_motivo_nao_vazio" CHECK (
  "motivo" IS NULL OR length(btrim("motivo")) > 0
);

ALTER TABLE "HistoricoRetorno" ADD CONSTRAINT "HistoricoRetorno_coerente_por_tipo" CHECK (
  (
    "tipo" = 'CRIACAO'
    AND "situacao_anterior" IS NULL
    AND "data_anterior" IS NULL
    AND "data_nova" IS NOT NULL
    AND "situacao_nova" = 'ABERTO'
  )
  OR (
    "tipo" = 'CORRECAO_DE_DATA'
    AND "situacao_anterior" IS NOT NULL AND "situacao_anterior" = 'ABERTO'
    AND "situacao_nova" = 'ABERTO'
    AND "data_anterior" IS NOT NULL
    AND "data_nova" IS NOT NULL
    AND "data_anterior" <> "data_nova"
  )
  OR (
    "tipo" = 'DESCARTE'
    AND "situacao_anterior" IS NOT NULL AND "situacao_anterior" = 'ABERTO'
    AND "situacao_nova" = 'DESCARTADO'
    AND "data_anterior" IS NULL
    AND "data_nova" IS NULL
    AND "motivo" IS NOT NULL
    AND length(btrim("motivo")) > 0
  )
  OR (
    "tipo" = 'ATENDIMENTO'
    AND "situacao_anterior" IS NOT NULL AND "situacao_anterior" = 'ABERTO'
    AND "situacao_nova" = 'ATENDIDO'
    AND "data_anterior" IS NULL
    AND "data_nova" IS NULL
  )
);

CREATE UNIQUE INDEX "Retorno_visita_origem_aberto" ON "Retorno"("visita_origem_id") WHERE "situacao" = 'ABERTO';
