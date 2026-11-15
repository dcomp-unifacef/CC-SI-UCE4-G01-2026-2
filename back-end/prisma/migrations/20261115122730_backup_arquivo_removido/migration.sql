-- AlterTable
ALTER TABLE "BackupExecucao" ADD COLUMN     "arquivo_removido_em" TIMESTAMPTZ(3);

ALTER TABLE "BackupExecucao" ADD CONSTRAINT "BackupExecucao_remocao_coerente" CHECK (
  "arquivo_removido_em" IS NULL
  OR (
    "arquivo_removido_em" IS NOT NULL
    AND "situacao" = 'CONCLUIDO'
  )
);
