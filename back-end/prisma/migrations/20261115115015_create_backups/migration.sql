-- CreateEnum
CREATE TYPE "SituacaoBackup" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO', 'FALHOU');

-- CreateEnum
CREATE TYPE "OrigemBackup" AS ENUM ('AGENDADO', 'MANUAL');

-- AlterTable
ALTER TABLE "Configuracao" ADD COLUMN     "backup_horario_min" INTEGER NOT NULL DEFAULT 120;

-- CreateTable
CREATE TABLE "BackupExecucao" (
    "id" SERIAL NOT NULL,
    "origem" "OrigemBackup" NOT NULL,
    "situacao" "SituacaoBackup" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "data_referencia" DATE,
    "iniciado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_sinal_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizado_em" TIMESTAMPTZ(3),
    "arquivo" TEXT,
    "tamanho_bytes" BIGINT,
    "sha256" TEXT,
    "erro" TEXT,
    "solicitado_por_id" INTEGER,
    "aviso_visto_em" TIMESTAMPTZ(3),
    "aviso_visto_por_id" INTEGER,

    CONSTRAINT "BackupExecucao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BackupExecucao_arquivo_key" ON "BackupExecucao"("arquivo");

-- CreateIndex
CREATE INDEX "BackupExecucao_iniciado_em_idx" ON "BackupExecucao"("iniciado_em");

-- CreateIndex
CREATE INDEX "BackupExecucao_situacao_finalizado_em_idx" ON "BackupExecucao"("situacao", "finalizado_em");

-- AddForeignKey
ALTER TABLE "BackupExecucao" ADD CONSTRAINT "BackupExecucao_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackupExecucao" ADD CONSTRAINT "BackupExecucao_aviso_visto_por_id_fkey" FOREIGN KEY ("aviso_visto_por_id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_backup_horario_valido" CHECK (
  "backup_horario_min" IS NOT NULL
  AND "backup_horario_min" >= 0
  AND "backup_horario_min" <= 1439
);

ALTER TABLE "BackupExecucao" ADD CONSTRAINT "BackupExecucao_origem_coerente" CHECK (
  (
    "origem" = 'AGENDADO'
    AND "data_referencia" IS NOT NULL
    AND "solicitado_por_id" IS NULL
  )
  OR (
    "origem" = 'MANUAL'
    AND "data_referencia" IS NULL
    AND "solicitado_por_id" IS NOT NULL
  )
);

ALTER TABLE "BackupExecucao" ADD CONSTRAINT "BackupExecucao_situacao_coerente" CHECK (
  (
    "situacao" = 'EM_ANDAMENTO'
    AND "finalizado_em" IS NULL
    AND "arquivo" IS NULL
    AND "tamanho_bytes" IS NULL
    AND "sha256" IS NULL
    AND "erro" IS NULL
  )
  OR (
    "situacao" = 'CONCLUIDO'
    AND "finalizado_em" IS NOT NULL
    AND "arquivo" IS NOT NULL
    AND "arquivo" ~ '^odontosystem-[0-9]{8}-[0-9]{6}\.dump$'
    AND "tamanho_bytes" IS NOT NULL
    AND "tamanho_bytes" > 0
    AND "sha256" IS NOT NULL
    AND "sha256" ~ '^[0-9a-f]{64}$'
    AND "erro" IS NULL
  )
  OR (
    "situacao" = 'FALHOU'
    AND "finalizado_em" IS NOT NULL
    AND "arquivo" IS NULL
    AND "tamanho_bytes" IS NULL
    AND "sha256" IS NULL
    AND "erro" IS NOT NULL
    AND length(btrim("erro")) > 0
  )
);

ALTER TABLE "BackupExecucao" ADD CONSTRAINT "BackupExecucao_aviso_coerente" CHECK (
  (
    "aviso_visto_em" IS NULL
    AND "aviso_visto_por_id" IS NULL
  )
  OR (
    "aviso_visto_em" IS NOT NULL
    AND "aviso_visto_por_id" IS NOT NULL
    AND "situacao" = 'FALHOU'
  )
);

CREATE UNIQUE INDEX "BackupExecucao_um_em_andamento" ON "BackupExecucao"("situacao") WHERE "situacao" = 'EM_ANDAMENTO';

CREATE UNIQUE INDEX "BackupExecucao_agendado_por_dia" ON "BackupExecucao"("data_referencia") WHERE "origem" = 'AGENDADO' AND "situacao" IN ('EM_ANDAMENTO', 'CONCLUIDO');
